-- Transfers now require admin review before funds move.
--
-- 1. Each account gets a customizable "pending review" message (like the
--    per-account transfer OTP), shown to the user after they submit a transfer.
-- 2. transfer_funds / send_external_transfer no longer move money. They validate
--    everything (state, OTP, balance) and queue a row in pending_transfers.
-- 3. Admins approve (funds move + transactions recorded) or reject from the
--    admin panel.

-- ── Per-account custom pending-review message ────────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS transfer_pending_message text;

-- ── Pending transfer queue ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_transfers (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  from_account_id uuid NOT NULL,
  to_account_id   uuid,
  transfer_type   text NOT NULL,                 -- 'own' | 'external'
  amount          numeric(15,2) NOT NULL,
  note            text,
  reference       text NOT NULL,
  -- external recipient details (null for own-account transfers)
  beneficiary_id   uuid,
  beneficiary_name text,
  bank_name        text,
  account_number   text,
  swift_bic        text,
  iban             text,
  status      text NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pending_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT pending_transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT pending_transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT pending_transfers_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL
);

ALTER TABLE public.pending_transfers ENABLE ROW LEVEL SECURITY;

-- All writes happen through SECURITY DEFINER functions; clients only read.
CREATE POLICY "Users read own pending transfers" ON public.pending_transfers
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read pending transfers" ON public.pending_transfers
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── transfer_funds: queue instead of moving money ────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_funds(p_user_id uuid, p_from_id uuid, p_to_id uuid, p_amount numeric, p_note text DEFAULT NULL::text, p_otp_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  from_account RECORD;
  to_account   RECORD;
  error_message TEXT;
  ref_code TEXT;
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

  -- OTP is always required for every transfer
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

  -- Queue for admin review — funds are NOT moved yet.
  ref_code := 'TXN-' || upper(substr(gen_random_uuid()::text, 1, 8));

  INSERT INTO public.pending_transfers (
    user_id, from_account_id, to_account_id, transfer_type, amount, note, reference, status
  ) VALUES (
    p_user_id, p_from_id, p_to_id, 'own', p_amount, p_note, ref_code, 'pending'
  );

  RETURN json_build_object(
    'ok',        TRUE,
    'pending',   TRUE,
    'reference', ref_code,
    'from_name', from_account.name,
    'to_name',   to_account.name,
    'amount',    p_amount,
    'message',   from_account.transfer_pending_message
  );
END;
$function$;

-- ── send_external_transfer: queue instead of moving money ────────────────────
CREATE OR REPLACE FUNCTION public.send_external_transfer(p_user_id uuid, p_account_id uuid, p_beneficiary_id uuid DEFAULT NULL::uuid, p_beneficiary_name text DEFAULT NULL::text, p_bank_name text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_amount numeric DEFAULT 0, p_note text DEFAULT NULL::text, p_save_beneficiary boolean DEFAULT false, p_swift_bic text DEFAULT NULL::text, p_iban text DEFAULT NULL::text, p_otp_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  src_account  RECORD;
  bene_id      UUID;
  ref_code     TEXT;
  error_message TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::UUID IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO src_account FROM public.accounts WHERE id = p_account_id;

  IF NOT FOUND OR src_account.user_id IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid source account');
  END IF;

  IF src_account.account_state IS NULL THEN
    src_account.account_state := src_account.status;
  END IF;

  IF src_account.account_state <> 'active' THEN
    IF src_account.account_state = 'inactive' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_inactive'),
        'Transfers are not allowed from inactive accounts.'
      );
    ELSIF src_account.account_state = 'on_hold' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_on_hold'),
        'Transfers are not allowed from accounts on hold.'
      );
    ELSIF src_account.account_state = 'suspended' THEN
      error_message := COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_account_suspended'),
        'Transfers are not allowed from suspended accounts.'
      );
    ELSE
      error_message := 'Transfers are not allowed from this account.';
    END IF;
    RETURN json_build_object('ok', FALSE, 'error', error_message);
  END IF;

  IF src_account.transaction_limit IS NOT NULL AND p_amount > src_account.transaction_limit THEN
    RETURN json_build_object('ok', FALSE, 'error', 'This transfer exceeds the account transaction limit.');
  END IF;

  -- OTP always required
  IF p_otp_code IS NULL OR p_otp_code = '' THEN
    RETURN json_build_object(
      'ok', FALSE,
      'error', COALESCE(
        (SELECT value FROM public.admin_settings WHERE key = 'error_transfer_otp_required'),
        'A transfer OTP is required. Please contact your account manager to obtain one.'
      )
    );
  END IF;

  IF NOT public.verify_transfer_otp(p_account_id, p_otp_code) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid or already-used OTP code.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer amount must be greater than zero.');
  END IF;

  IF src_account.balance < p_amount THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Insufficient balance.');
  END IF;

  -- Optionally save beneficiary now so it is reusable regardless of review outcome
  IF p_save_beneficiary AND p_beneficiary_id IS NULL THEN
    INSERT INTO public.beneficiaries (user_id, full_name, bank_name, account_number, swift_bic, iban)
    VALUES (p_user_id, p_beneficiary_name, p_bank_name, p_account_number, p_swift_bic, p_iban)
    RETURNING id INTO bene_id;
  ELSE
    bene_id := p_beneficiary_id;
  END IF;

  -- Queue for admin review — funds are NOT moved yet.
  ref_code := 'EXT-' || upper(substr(gen_random_uuid()::text, 1, 8));

  INSERT INTO public.pending_transfers (
    user_id, from_account_id, transfer_type, amount, note, reference,
    beneficiary_id, beneficiary_name, bank_name, account_number, swift_bic, iban, status
  ) VALUES (
    p_user_id, p_account_id, 'external', p_amount, p_note, ref_code,
    bene_id, p_beneficiary_name, p_bank_name, p_account_number, p_swift_bic, p_iban, 'pending'
  );

  RETURN json_build_object(
    'ok',             TRUE,
    'pending',        TRUE,
    'reference',      ref_code,
    'beneficiary_id', bene_id,
    'amount',         p_amount,
    'message',        src_account.transfer_pending_message
  );
END;
$function$;

-- ── Admin: set per-account pending-review message ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_transfer_pending_message(p_account_id uuid, p_message text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Admin access required');
  END IF;

  UPDATE public.accounts
  SET transfer_pending_message = NULLIF(btrim(p_message), '')
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Account not found');
  END IF;

  RETURN json_build_object('ok', TRUE);
END;
$function$;

-- ── Admin: list pending transfers (with account + user context) ──────────────
CREATE OR REPLACE FUNCTION public.admin_list_pending_transfers()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COALESCE(json_agg(t), '[]'::json) INTO result
  FROM (
    SELECT
      pt.id,
      pt.user_id,
      pt.from_account_id,
      pt.to_account_id,
      pt.transfer_type,
      pt.amount,
      pt.note,
      pt.reference,
      pt.beneficiary_name,
      pt.bank_name,
      pt.account_number,
      pt.status,
      pt.review_note,
      pt.reviewed_at,
      pt.created_at,
      fa.name           AS from_account_name,
      fa.account_number AS from_account_number,
      fa.balance        AS from_account_balance,
      ta.name           AS to_account_name,
      p.email           AS user_email,
      p.full_name       AS user_full_name
    FROM public.pending_transfers pt
    JOIN public.accounts fa ON fa.id = pt.from_account_id
    LEFT JOIN public.accounts ta ON ta.id = pt.to_account_id
    LEFT JOIN public.profiles p ON p.id = pt.user_id
    ORDER BY
      CASE WHEN pt.status = 'pending' THEN 0 ELSE 1 END,
      pt.created_at DESC
  ) t;

  RETURN result;
END;
$function$;

-- ── Admin: approve a pending transfer (moves the money) ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_transfer(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  pt  RECORD;
  src RECORD;
  dst RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Admin access required');
  END IF;

  SELECT * INTO pt FROM public.pending_transfers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer not found');
  END IF;
  IF pt.status <> 'pending' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer already ' || pt.status || '.');
  END IF;

  SELECT * INTO src FROM public.accounts WHERE id = pt.from_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Source account no longer exists.');
  END IF;
  IF src.balance < pt.amount THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Insufficient balance to approve this transfer.');
  END IF;

  IF pt.transfer_type = 'own' THEN
    SELECT * INTO dst FROM public.accounts WHERE id = pt.to_account_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', FALSE, 'error', 'Destination account no longer exists.');
    END IF;

    UPDATE public.accounts SET balance = balance - pt.amount WHERE id = pt.from_account_id;
    UPDATE public.accounts SET balance = balance + pt.amount WHERE id = pt.to_account_id;

    INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
    VALUES (pt.user_id, pt.from_account_id, 'Transfer', 'Transfer', pt.amount, 'debit', pt.note, now());

    INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
    VALUES (pt.user_id, pt.to_account_id, 'Transfer', 'Transfer', pt.amount, 'credit', pt.note, now());
  ELSE
    UPDATE public.accounts SET balance = balance - pt.amount WHERE id = pt.from_account_id;

    INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
    VALUES (pt.user_id, pt.from_account_id, COALESCE(pt.beneficiary_name, 'External Transfer'), 'Transfer', pt.amount, 'debit', pt.note, now());
  END IF;

  UPDATE public.pending_transfers
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_id;

  RETURN json_build_object('ok', TRUE, 'reference', pt.reference);
END;
$function$;

-- ── Admin: reject a pending transfer ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_transfer(p_id uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  pt RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Admin access required');
  END IF;

  SELECT * INTO pt FROM public.pending_transfers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer not found');
  END IF;
  IF pt.status <> 'pending' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Transfer already ' || pt.status || '.');
  END IF;

  UPDATE public.pending_transfers
  SET status = 'rejected', review_note = NULLIF(btrim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_id;

  RETURN json_build_object('ok', TRUE, 'reference', pt.reference);
END;
$function$;
