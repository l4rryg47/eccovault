-- Admin account controls and transfer OTP support

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS transaction_limit NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS requires_transfer_otp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hold_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS account_state TEXT NULL;

UPDATE public.accounts
SET account_state = status
WHERE account_state IS NULL;

CREATE TABLE IF NOT EXISTS public.transfer_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public retrieval of admin-configured settings for user-facing flows.
DROP FUNCTION IF EXISTS public.public_get_settings() CASCADE;
CREATE OR REPLACE FUNCTION public.public_get_settings()
RETURNS TABLE (key TEXT, value TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT key, value, updated_at FROM public.admin_settings ORDER BY key;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.public_get_settings() TO authenticated;

-- Admin account management functions.
DROP FUNCTION IF EXISTS public.admin_get_all_accounts() CASCADE;
CREATE OR REPLACE FUNCTION public.admin_get_all_accounts()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  type TEXT,
  balance NUMERIC,
  account_number TEXT,
  status TEXT,
  account_state TEXT,
  transaction_limit NUMERIC,
  requires_transfer_otp BOOLEAN,
  hold_reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.name,
    a.type::TEXT,
    a.balance,
    a.account_number,
    a.status::TEXT,
    COALESCE(a.account_state, a.status::TEXT) AS account_state,
    a.transaction_limit,
    a.requires_transfer_otp,
    a.hold_reason,
    a.created_at
  FROM public.accounts a
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP FUNCTION IF EXISTS public.admin_create_account(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_create_account(
  p_user_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_balance NUMERIC DEFAULT 0,
  p_account_number TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_transaction_limit NUMERIC DEFAULT NULL,
  p_requires_transfer_otp BOOLEAN DEFAULT FALSE,
  p_hold_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  type TEXT,
  balance NUMERIC,
  account_number TEXT,
  status TEXT,
  account_state TEXT,
  transaction_limit NUMERIC,
  requires_transfer_otp BOOLEAN,
  hold_reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  INSERT INTO public.accounts (
    user_id, name, type, balance, account_number, status,
    account_state, transaction_limit, requires_transfer_otp, hold_reason
  ) VALUES (
    p_user_id,
    p_name,
    p_type,
    COALESCE(p_balance, 0),
    COALESCE(p_account_number, lpad((floor(random() * 10000000000))::text, 10, '0')),
    p_status,
    p_status,
    p_transaction_limit,
    p_requires_transfer_otp,
    p_hold_reason
  )
  RETURNING
    id, user_id, name, type, balance, account_number, status,
    account_state, transaction_limit, requires_transfer_otp, hold_reason, created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_update_account(UUID, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_update_account(
  p_account_id UUID,
  p_name TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_transaction_limit NUMERIC DEFAULT NULL,
  p_requires_transfer_otp BOOLEAN DEFAULT NULL,
  p_hold_reason TEXT DEFAULT NULL,
  p_account_state TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  UPDATE public.accounts
  SET
    name = COALESCE(p_name, name),
    status = COALESCE(p_status, status),
    account_state = COALESCE(p_account_state, account_state),
    transaction_limit = CASE WHEN p_transaction_limit IS NOT NULL THEN p_transaction_limit ELSE transaction_limit END,
    requires_transfer_otp = COALESCE(p_requires_transfer_otp, requires_transfer_otp),
    hold_reason = COALESCE(p_hold_reason, hold_reason)
  WHERE id = p_account_id;

  RETURN json_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_delete_account(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_account_id UUID)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  DELETE FROM public.accounts WHERE id = p_account_id;
  RETURN json_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transfer support functions.
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
    AND expires_at > now()
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

DROP FUNCTION IF EXISTS public.transfer_funds(UUID, UUID, UUID, NUMERIC, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_user_id UUID,
  p_from_id UUID,
  p_to_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL,
  p_otp_code TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  from_account RECORD;
  to_account RECORD;
  error_message TEXT;
  debit_id UUID;
  credit_id UUID;
  limit_violation BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::UUID IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO from_account FROM public.accounts WHERE id = p_from_id;
  SELECT * INTO to_account FROM public.accounts WHERE id = p_to_id;

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
      error_message := COALESCE((SELECT value FROM public.admin_settings WHERE key = 'error_account_inactive'), 'Transfers are not allowed from inactive accounts.');
    ELSIF from_account.account_state = 'on_hold' THEN
      error_message := COALESCE((SELECT value FROM public.admin_settings WHERE key = 'error_account_on_hold'), 'Transfers are not allowed from accounts on hold.');
    ELSIF from_account.account_state = 'suspended' THEN
      error_message := COALESCE((SELECT value FROM public.admin_settings WHERE key = 'error_account_suspended'), 'Transfers are not allowed from suspended accounts.');
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

  IF from_account.requires_transfer_otp AND p_otp_code IS NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', COALESCE((SELECT value FROM public.admin_settings WHERE key = 'error_transfer_otp_required'), 'OTP is required for transfers from this account.'));
  END IF;

  IF from_account.requires_transfer_otp AND NOT public.verify_transfer_otp(p_from_id, p_otp_code) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid or expired OTP code.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer amount must be greater than zero.');
  END IF;

  IF from_account.balance < p_amount THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Insufficient balance.');
  END IF;

  UPDATE public.accounts
  SET balance = balance - p_amount
  WHERE id = p_from_id;

  UPDATE public.accounts
  SET balance = balance + p_amount
  WHERE id = p_to_id;

  INSERT INTO public.transactions (
    user_id, account_id, name, category, amount, type, note, created_at
  ) VALUES (
    p_user_id, p_from_id, 'Transfer', 'Transfer', p_amount, 'debit', p_note, now()
  ) RETURNING id INTO debit_id;

  INSERT INTO public.transactions (
    user_id, account_id, name, category, amount, type, note, created_at
  ) VALUES (
    p_user_id, p_to_id, 'Transfer', 'Transfer', p_amount, 'credit', p_note, now()
  ) RETURNING id INTO credit_id;

  RETURN json_build_object(
    'ok', TRUE,
    'debit_id', debit_id,
    'credit_id', credit_id,
    'from_name', from_account.name,
    'to_name', to_account.name,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_all_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_account(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_account(UUID, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_transfer_otp(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_funds(UUID, UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
