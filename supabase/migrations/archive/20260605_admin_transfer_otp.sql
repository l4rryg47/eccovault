-- Admin-generated transfer OTP
-- Every transfer now requires an OTP provided by the admin.
-- OTPs are single-use with no time expiry.

-- Extend transfer_otps: drop expires_at constraint, allow NULL
ALTER TABLE public.transfer_otps
  ALTER COLUMN expires_at DROP NOT NULL;

-- RPC for admin to generate a transfer OTP for an account
DROP FUNCTION IF EXISTS public.admin_generate_transfer_otp(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_generate_transfer_otp(p_account_id UUID)
RETURNS JSON AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Admin access required');
  END IF;

  -- Invalidate any existing unused OTPs for this account
  UPDATE public.transfer_otps
  SET used = TRUE
  WHERE account_id = p_account_id AND used = FALSE;

  -- Generate a new 6-digit code
  new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  INSERT INTO public.transfer_otps (user_id, account_id, code, expires_at, used)
  SELECT a.user_id, p_account_id, new_code, NULL, FALSE
  FROM public.accounts a
  WHERE a.id = p_account_id;

  RETURN json_build_object('ok', TRUE, 'code', new_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_generate_transfer_otp(UUID) TO authenticated;

-- Update verify_transfer_otp to not check expires_at when it is NULL
DROP FUNCTION IF EXISTS public.verify_transfer_otp(UUID, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.verify_transfer_otp(p_account_id UUID, p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  otp_record RECORD;
BEGIN
  SELECT * INTO otp_record
  FROM public.transfer_otps
  WHERE account_id = p_account_id
    AND code = p_code
    AND used = FALSE
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.transfer_otps
  SET used = TRUE
  WHERE id = otp_record.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_transfer_otp(UUID, TEXT) TO authenticated;

-- Update transfer_funds: OTP is now always required (not just when requires_transfer_otp=true)
DROP FUNCTION IF EXISTS public.transfer_funds(UUID, UUID, UUID, NUMERIC, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_user_id  UUID,
  p_from_id  UUID,
  p_to_id    UUID,
  p_amount   NUMERIC,
  p_note     TEXT DEFAULT NULL,
  p_otp_code TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  from_account RECORD;
  to_account   RECORD;
  error_message TEXT;
  debit_id UUID;
  credit_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::UUID IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO from_account FROM public.accounts WHERE id = p_from_id;
  SELECT * INTO to_account   FROM public.accounts WHERE id = p_to_id;

  IF NOT FOUND OR from_account.user_id IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid source account');
  END IF;

  IF from_account.account_state IS NULL THEN
    from_account.account_state := from_account.status;
  END IF;
  IF to_account.account_state IS NULL THEN
    to_account.account_state := to_account.status;
  END IF;

  IF from_account.account_state <> 'active' THEN
    IF from_account.account_state = 'inactive' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_inactive'),
        'Transfers are not allowed from inactive accounts.'
      );
    ELSIF from_account.account_state = 'on_hold' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_on_hold'),
        'Transfers are not allowed from accounts on hold.'
      );
    ELSIF from_account.account_state = 'suspended' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_suspended'),
        'Transfers are not allowed from suspended accounts.'
      );
    ELSE
      error_message := 'Transfers are not allowed from this account.';
    END IF;
    RETURN json_build_object('ok', FALSE, 'error', error_message);
  END IF;

  IF to_account.account_state <> 'active' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Destination account is not available for transfers.');
  END IF;

  IF from_account.transaction_limit IS NOT NULL AND p_amount > from_account.transaction_limit THEN
    RETURN json_build_object('ok', FALSE, 'error', 'This transfer exceeds the account transaction limit.');
  END IF;

  -- OTP is now always required for every transfer
  IF p_otp_code IS NULL OR p_otp_code = '' THEN
    RETURN json_build_object(
      'ok', FALSE,
      'error', COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_transfer_otp_required'),
        'A transfer OTP is required. Please contact your account manager to obtain one.'
      )
    );
  END IF;

  IF NOT public.verify_transfer_otp(p_from_id, p_otp_code) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid or already-used OTP code.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer amount must be greater than zero.');
  END IF;

  IF from_account.balance < p_amount THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Insufficient balance.');
  END IF;

  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_from_id;
  UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_to_id;

  INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
  VALUES (p_user_id, p_from_id, 'Transfer', 'Transfer', p_amount, 'debit', p_note, now())
  RETURNING id INTO debit_id;

  INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
  VALUES (p_user_id, p_to_id, 'Transfer', 'Transfer', p_amount, 'credit', p_note, now())
  RETURNING id INTO credit_id;

  RETURN json_build_object(
    'ok',        TRUE,
    'debit_id',  debit_id,
    'credit_id', credit_id,
    'from_name', from_account.name,
    'to_name',   to_account.name,
    'amount',    p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.transfer_funds(UUID, UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
