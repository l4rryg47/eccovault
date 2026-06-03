-- =============================================================================
-- BASELINE SCHEMA
-- Consolidated ground-truth schema for a fresh Supabase project.
-- Generated from a full dump of the original project, with three fixes:
--   1. CREATE EXTENSION pgcrypto (needed by crypt()/gen_salt()/gen_random_uuid()).
--   2. All RLS policies that dumped as `TO unknown (OID=0)` -> `TO authenticated`.
--   3. Dropped the legacy 5-arg transfer_funds() overload (no OTP) — kept only
--      the 6-arg version that enforces the mandatory transfer OTP.
-- Also: RLS is enabled on phone_otps (dump left it off); it has no policies and
-- is only reached through SECURITY DEFINER functions, matching transfer_otps.
-- =============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enum types ───────────────────────────────────────────────────────────────
CREATE TYPE public.account_status AS ENUM ('active', 'inactive', 'frozen');
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'investment', 'credit');
CREATE TYPE public.card_kind AS ENUM ('physical', 'virtual');
CREATE TYPE public.card_payment_status AS ENUM ('pending', 'approved', 'declined');
CREATE TYPE public.card_type AS ENUM ('visa', 'mastercard', 'amex');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'confirming', 'confirmed', 'credited', 'expired', 'rejected');
CREATE TYPE public.external_transfer_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type account_type NOT NULL,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  account_number text NOT NULL,
  status account_status NOT NULL DEFAULT 'active'::account_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  routing_number text NOT NULL DEFAULT '021000021'::text,
  transaction_limit numeric,
  requires_transfer_otp boolean NOT NULL DEFAULT false,
  hold_reason text,
  account_state text
);

CREATE TABLE public.admin_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.admins (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.beneficiaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  routing_number text,
  iban text,
  swift_bic text,
  email text,
  nickname text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.card_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  cardholder_name text NOT NULL,
  card_last_four text NOT NULL,
  card_expiry text NOT NULL,
  card_type text NOT NULL DEFAULT 'visa'::text,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  reference text,
  status card_payment_status NOT NULL DEFAULT 'pending'::card_payment_status,
  admin_note text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  card_number text,
  card_cvv text
);

CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  name text NOT NULL,
  last_four text NOT NULL,
  expiry text NOT NULL,
  card_type card_type NOT NULL DEFAULT 'visa'::card_type,
  kind card_kind NOT NULL DEFAULT 'physical'::card_kind,
  credit_limit numeric(15,2),
  frozen boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crypto_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  usd_amount numeric(15,2) NOT NULL,
  payment_id text,
  payment_url text,
  crypto_currency text NOT NULL DEFAULT 'USDT'::text,
  crypto_amount numeric(24,8),
  crypto_address text,
  exchange_rate numeric(24,8),
  fee_usd numeric(15,2) NOT NULL DEFAULT 0,
  status deposit_status NOT NULL DEFAULT 'pending'::deposit_status,
  tx_hash text,
  confirmations integer NOT NULL DEFAULT 0,
  admin_note text,
  credited_by uuid,
  credited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:30:00'::interval),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.external_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  beneficiary_id uuid,
  beneficiary_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  amount numeric(15,2) NOT NULL,
  fee numeric(15,2) NOT NULL DEFAULT 0,
  note text,
  status external_transfer_status NOT NULL DEFAULT 'pending'::external_transfer_status,
  reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  ticker text NOT NULL,
  shares numeric(18,8) NOT NULL,
  avg_cost numeric(15,2) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.phone_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_admin boolean DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending'::text,
  profile_data jsonb,
  phone_verified boolean NOT NULL DEFAULT false
);

CREATE TABLE public.savings_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  name text NOT NULL,
  target numeric(15,2) NOT NULL,
  current numeric(15,2) NOT NULL DEFAULT 0,
  apy numeric(5,2) NOT NULL DEFAULT 4.5,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_email text,
  body text NOT NULL,
  resend_email_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  subject text NOT NULL,
  initial_message text NOT NULL,
  support_pin text NOT NULL,
  status text NOT NULL DEFAULT 'pin_sent'::text,
  pin_expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:30:00'::interval),
  opened_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other'::text,
  amount numeric(15,2) NOT NULL,
  type transaction_type NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.transfer_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Primary keys, unique & foreign key constraints ───────────────────────────
ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_number_unique UNIQUE (account_number);
ALTER TABLE public.accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (key);

ALTER TABLE public.admins ADD CONSTRAINT admins_pkey PRIMARY KEY (user_id);
ALTER TABLE public.admins ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_pkey PRIMARY KEY (id);
ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.card_payments ADD CONSTRAINT card_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.card_payments ADD CONSTRAINT card_payments_pkey PRIMARY KEY (id);
ALTER TABLE public.card_payments ADD CONSTRAINT card_payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);
ALTER TABLE public.card_payments ADD CONSTRAINT card_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cards ADD CONSTRAINT cards_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.cards ADD CONSTRAINT cards_pkey PRIMARY KEY (id);
ALTER TABLE public.cards ADD CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.crypto_deposits ADD CONSTRAINT crypto_deposits_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.crypto_deposits ADD CONSTRAINT crypto_deposits_credited_by_fkey FOREIGN KEY (credited_by) REFERENCES auth.users(id);
ALTER TABLE public.crypto_deposits ADD CONSTRAINT crypto_deposits_pkey PRIMARY KEY (id);
ALTER TABLE public.crypto_deposits ADD CONSTRAINT crypto_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.external_transfers ADD CONSTRAINT external_transfers_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.external_transfers ADD CONSTRAINT external_transfers_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE SET NULL;
ALTER TABLE public.external_transfers ADD CONSTRAINT external_transfers_pkey PRIMARY KEY (id);
ALTER TABLE public.external_transfers ADD CONSTRAINT external_transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.investments ADD CONSTRAINT investments_pkey PRIMARY KEY (id);
ALTER TABLE public.investments ADD CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.phone_otps ADD CONSTRAINT phone_otps_pkey PRIMARY KEY (id);
ALTER TABLE public.phone_otps ADD CONSTRAINT phone_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'frozen'::text, 'on_hold'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (id);
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- support_requests must get its primary key before support_messages references it.
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES support_requests(id) ON DELETE CASCADE;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.transfer_otps ADD CONSTRAINT transfer_otps_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transfer_otps ADD CONSTRAINT transfer_otps_pkey PRIMARY KEY (id);
ALTER TABLE public.transfer_otps ADD CONSTRAINT transfer_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX card_payments_status ON public.card_payments USING btree (status, created_at DESC);
CREATE INDEX card_payments_user ON public.card_payments USING btree (user_id, created_at DESC);
CREATE INDEX crypto_deposits_status ON public.crypto_deposits USING btree (status, created_at DESC);
CREATE INDEX crypto_deposits_user ON public.crypto_deposits USING btree (user_id, created_at DESC);
CREATE INDEX external_transfers_user ON public.external_transfers USING btree (user_id, created_at DESC);
CREATE INDEX phone_otps_user_id_idx ON public.phone_otps USING btree (user_id);
CREATE INDEX support_messages_request_created ON public.support_messages USING btree (request_id, created_at);
CREATE INDEX support_requests_pin_lookup ON public.support_requests USING btree (support_pin, email, status);
CREATE INDEX support_requests_status_last_message ON public.support_requests USING btree (status, last_message_at DESC);
CREATE INDEX transactions_user_created ON public.transactions USING btree (user_id, created_at DESC);

-- ── Functions ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  meta_is_admin TEXT;
BEGIN
  -- Try auth user metadata first (raw_user_meta_data may contain is_admin)
  SELECT raw_user_meta_data->>'is_admin' INTO meta_is_admin
    FROM auth.users
    WHERE id = auth.uid();

  IF meta_is_admin IS NOT NULL THEN
    BEGIN
      IF (meta_is_admin)::BOOLEAN THEN
        RETURN TRUE;
      END IF;
    EXCEPTION WHEN others THEN
      -- ignore parse errors and fall through to profiles table check
    END;
  END IF;

  -- Fallback to profiles.is_admin flag
  RETURN (
    SELECT COALESCE(is_admin, FALSE)
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set
      email     = excluded.email,
      full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_card_payment_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end; $function$;

CREATE OR REPLACE FUNCTION public.set_deposit_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_account_id uuid, p_amount numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_account public.accounts;
  v_type    public.transaction_type;
  v_name    text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;
  if p_amount = 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount cannot be zero.');
  end if;

  select * into v_account from public.accounts where id = p_account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Account not found.');
  end if;

  if p_amount > 0 then
    v_type := 'credit'; v_name := 'Admin Credit';
  else
    if v_account.balance + p_amount < 0 then
      return jsonb_build_object('ok', false, 'error', 'Insufficient balance for deduction.');
    end if;
    v_type := 'debit'; v_name := 'Admin Deduction';
  end if;

  update public.accounts set balance = balance + p_amount where id = p_account_id;

  insert into public.transactions(user_id, account_id, name, category, amount, type, note)
  values(v_account.user_id, p_account_id, v_name, 'Admin', abs(p_amount), v_type,
         coalesce(p_note, 'Manual adjustment by admin'));

  return jsonb_build_object('ok', true, 'new_balance', v_account.balance + p_amount);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end; $function$;

CREATE OR REPLACE FUNCTION public.deposit_funds(p_user_id uuid, p_account_id uuid, p_amount numeric, p_name text DEFAULT 'Deposit'::text, p_category text DEFAULT 'Income'::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_account_name text;
  v_tx_id        uuid;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero.');
  end if;

  select name into v_account_name
    from public.accounts
   where id = p_account_id and user_id = p_user_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Account not found.');
  end if;

  update public.accounts
     set balance = balance + p_amount
   where id = p_account_id;

  insert into public.transactions(user_id, account_id, name, category, amount, type, note)
  values (p_user_id, p_account_id, p_name, p_category, p_amount, 'credit', p_note)
  returning id into v_tx_id;

  return jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'account_name', v_account_name);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_card_payment(p_payment_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_pay    public.card_payments;
  v_result jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;

  select * into v_pay from public.card_payments
   where id = p_payment_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment not found.');
  end if;

  if v_pay.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Payment is already ' || v_pay.status::text);
  end if;

  v_result := public.deposit_funds(
    p_user_id    := v_pay.user_id,
    p_account_id := v_pay.account_id,
    p_amount     := v_pay.amount,
    p_name       := 'Card Deposit (' || v_pay.card_type || ' ****' || v_pay.card_last_four || ')',
    p_category   := 'Deposit',
    p_note       := coalesce(p_note, 'Approved by admin')
  );

  if not (v_result->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'error', v_result->>'error');
  end if;

  update public.card_payments
     set status       = 'approved',
         admin_note   = p_note,
         processed_by = auth.uid(),
         processed_at = now()
   where id = p_payment_id;

  return jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'amount', v_pay.amount);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_deposit  public.crypto_deposits;
  v_result   jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;

  -- Lock the deposit row
  select * into v_deposit
    from public.crypto_deposits
   where id = p_deposit_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Deposit not found.');
  end if;

  if v_deposit.status not in ('confirmed', 'confirming', 'pending') then
    return jsonb_build_object(
      'ok', false,
      'error', 'Deposit cannot be approved — current status: ' || v_deposit.status::text
    );
  end if;

  -- Credit the account
  v_result := public.deposit_funds(
    p_user_id    := v_deposit.user_id,
    p_account_id := v_deposit.account_id,
    p_amount     := v_deposit.usd_amount,
    p_name       := 'Crypto Deposit (' || coalesce(v_deposit.crypto_currency, 'USDT') || ')',
    p_category   := 'Deposit',
    p_note       := coalesce(p_note, 'Approved by admin. Ref: ' || v_deposit.id::text)
  );

  if not (v_result->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'error', v_result->>'error');
  end if;

  -- Mark deposit as credited
  update public.crypto_deposits
     set status       = 'credited',
         admin_note   = p_note,
         credited_by  = auth.uid(),
         credited_at  = now()
   where id = p_deposit_id;

  return jsonb_build_object(
    'ok',         true,
    'deposit_id', p_deposit_id,
    'amount',     v_deposit.usd_amount
  );

exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_account(p_user_id uuid, p_name text, p_type text, p_balance numeric DEFAULT 0, p_account_number text DEFAULT NULL::text, p_status text DEFAULT 'active'::text, p_transaction_limit numeric DEFAULT NULL::numeric, p_requires_transfer_otp boolean DEFAULT false, p_hold_reason text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, user_id uuid, name text, type text, balance numeric, account_number text, status text, account_state text, transaction_limit numeric, requires_transfer_otp boolean, hold_reason text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_user(p_email text, p_password text, p_full_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Email already exists');
  END IF;

  -- Create auth user using service role (this will fail if not using service role key)
  -- Note: This endpoint should only be accessible server-side or via a service role
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"user"}',
      NOW(),
      NOW()
    ) RETURNING id INTO v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Failed to create auth user: ' || SQLERRM);
  END;

  -- Create profile
  BEGIN
    INSERT INTO profiles (id, email, full_name) VALUES (v_user_id, p_email, p_full_name);
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Failed to create profile: ' || SQLERRM);
  END;

  RETURN json_build_object('ok', TRUE, 'user_id', v_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_decline_card_payment(p_payment_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_pay public.card_payments;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;

  select * into v_pay from public.card_payments
   where id = p_payment_id for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'Payment not found.'); end if;
  if v_pay.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Payment is already ' || v_pay.status::text);
  end if;

  update public.card_payments
     set status       = 'declined',
         admin_note   = p_note,
         processed_by = auth.uid(),
         processed_at = now()
   where id = p_payment_id;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_account(p_account_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  DELETE FROM public.accounts WHERE id = p_account_id;
  RETURN json_build_object('ok', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'User not found');
  END IF;

  -- Delete profile first (CASCADE may handle this)
  DELETE FROM profiles WHERE id = p_user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object('ok', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_generate_transfer_otp(p_account_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_all_accounts()
 RETURNS TABLE(id uuid, user_id uuid, name text, type text, balance numeric, account_number text, status text, account_state text, transaction_limit numeric, requires_transfer_otp boolean, hold_reason text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(p_limit integer DEFAULT 200)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  return query select * from public.transactions order by created_at desc limit p_limit;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_card_payments(p_status text DEFAULT NULL::text)
 RETURNS SETOF card_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  return query
    select * from public.card_payments
    where (p_status is null or status::text = p_status)
    order by created_at desc;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_deposits(p_status text DEFAULT NULL::text)
 RETURNS SETOF crypto_deposits
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  return query
    select d.*
    from public.crypto_deposits d
    where (p_status is null or d.status::text = p_status)
    order by d.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_settings()
 RETURNS TABLE(key text, value text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT s.key, s.value, s.updated_at FROM public.admin_settings AS s ORDER BY s.key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  select jsonb_build_object(
    'total_users',         (select count(*) from auth.users),
    'total_accounts',      (select count(*) from public.accounts),
    'total_balance',       (select coalesce(sum(greatest(balance,0)),0) from public.accounts),
    'pending_payments',    (select count(*) from public.card_payments where status='pending'),
    'total_transactions',  (select count(*) from public.transactions),
    'deposits_today',      (select coalesce(sum(amount),0) from public.transactions
                            where type='credit' and category='Deposit'
                              and created_at >= current_date)
  ) into v;
  return v;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_support_messages(p_request_id uuid)
 RETURNS TABLE(id uuid, request_id uuid, sender_type text, sender_email text, body text, resend_email_id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.request_id,
    m.sender_type,
    m.sender_email,
    m.body,
    m.resend_email_id,
    m.created_at
  FROM public.support_messages m
  WHERE m.request_id = p_request_id
  ORDER BY m.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_support_threads(p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, user_id uuid, email text, subject text, initial_message text, support_pin text, status text, pin_expires_at timestamp with time zone, opened_at timestamp with time zone, last_message_at timestamp with time zone, created_at timestamp with time zone, message_count bigint, last_message_preview text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.email,
    r.subject,
    r.initial_message,
    r.support_pin,
    r.status,
    r.pin_expires_at,
    r.opened_at,
    r.last_message_at,
    r.created_at,
    COUNT(m.id)::BIGINT AS message_count,
    COALESCE(
      (
        SELECT left(sm.body, 160)
        FROM public.support_messages sm
        WHERE sm.request_id = r.id
        ORDER BY sm.created_at DESC
        LIMIT 1
      ),
      left(r.initial_message, 160)
    )::TEXT AS last_message_preview
  FROM public.support_requests r
  LEFT JOIN public.support_messages m ON m.request_id = r.id
  WHERE p_status IS NULL OR r.status = p_status
  GROUP BY r.id
  ORDER BY r.last_message_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_user_accounts(p_user_id uuid)
 RETURNS SETOF accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  return query select * from public.accounts where user_id = p_user_id order by created_at;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_user_transactions(p_user_id uuid)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  return query select * from public.transactions
   where user_id = p_user_id order by created_at desc limit 200;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_users()
 RETURNS TABLE(id uuid, email text, full_name text, has_profile boolean, created_at timestamp with time zone, account_count bigint, total_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user is admin using the existing admin RPC used by the app.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(p.email, u.email)::TEXT AS email,
    p.full_name::TEXT AS full_name,
    (p.id IS NOT NULL) AS has_profile,
    COALESCE(p.created_at, u.created_at) AS created_at,
    COUNT(a.id)::BIGINT as account_count,
    COALESCE(SUM(a.balance), 0)::NUMERIC as total_balance
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN accounts a ON u.id = a.user_id
  GROUP BY u.id, u.email, u.created_at, p.id, p.email, p.full_name, p.created_at
  ORDER BY COALESCE(p.created_at, u.created_at) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_deposit_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_deposit public.crypto_deposits;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;

  select * into v_deposit
    from public.crypto_deposits
   where id = p_deposit_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Deposit not found.');
  end if;

  if v_deposit.status in ('credited', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'error', 'Deposit is already ' || v_deposit.status::text
    );
  end if;

  update public.crypto_deposits
     set status     = 'rejected',
         admin_note = p_note,
         credited_by = auth.uid(),
         credited_at = now()
   where id = p_deposit_id;

  return jsonb_build_object('ok', true, 'deposit_id', p_deposit_id);

exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN json_build_object('ok', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'Admin access required');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'suspended', 'frozen', 'on_hold') THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid status value');
  END IF;

  UPDATE profiles
  SET    approval_status = p_status,
         updated_at      = NOW()
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_account(p_account_id uuid, p_name text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_transaction_limit numeric DEFAULT NULL::numeric, p_requires_transfer_otp boolean DEFAULT NULL::boolean, p_hold_reason text DEFAULT NULL::text, p_account_state text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_support_status(p_request_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  IF p_status NOT IN ('pin_sent', 'open', 'pending_admin', 'resolved', 'closed') THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid status');
  END IF;

  UPDATE public.support_requests
  SET status = p_status,
      last_message_at = now()
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Support thread not found');
  END IF;

  RETURN json_build_object('ok', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_email text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'User not found');
  END IF;

  -- Update email if provided
  IF p_email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email AND id != p_user_id) THEN
      RETURN json_build_object('ok', FALSE, 'error', 'Email already in use');
    END IF;
    UPDATE auth.users SET email = p_email WHERE id = p_user_id;
    v_updated := TRUE;
  END IF;

  -- Update full_name if provided
  IF p_full_name IS NOT NULL OR (p_full_name IS NULL AND p_email IS NOT NULL) THEN
    UPDATE profiles SET full_name = p_full_name WHERE id = p_user_id;
    v_updated := TRUE;
  END IF;

  RETURN json_build_object('ok', TRUE, 'updated', v_updated);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_account(p_user_id uuid, p_name text, p_type account_type, p_candidate_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_account_id     uuid;
  v_account_number text := p_candidate_number;
  v_routing        text := '021000021';
  v_attempts       int  := 0;
begin
  if p_name is null or trim(p_name) = '' then
    return jsonb_build_object('ok', false, 'error', 'Account name is required.');
  end if;

  loop
    v_attempts := v_attempts + 1;

    begin
      insert into public.accounts (
        id, user_id, name, type, balance,
        account_number, routing_number, status
      )
      values (
        gen_random_uuid(),
        p_user_id,
        trim(p_name),
        p_type,
        0,
        v_account_number,
        v_routing,
        'active'
      )
      returning id into v_account_id;

      exit;  -- success

    exception
      when unique_violation then
        if v_attempts >= 5 then
          return jsonb_build_object(
            'ok', false,
            'error', 'Could not generate a unique account number. Please try again.'
          );
        end if;
        -- Generate a new candidate server-side and retry
        v_account_number := lpad(
          (
            (extract(epoch from now())::bigint % 1000000)::text ||
            lpad((floor(random() * 10000))::int::text, 4, '0')
          ),
          10, '0'
        );
    end;
  end loop;

  return jsonb_build_object(
    'ok',             true,
    'id',             v_account_id,
    'account_number', v_account_number,
    'routing_number', v_routing
  );

exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_transfer_otp(p_account_id uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.send_external_transfer(p_user_id uuid, p_account_id uuid, p_beneficiary_id uuid DEFAULT NULL::uuid, p_beneficiary_name text DEFAULT NULL::text, p_bank_name text DEFAULT NULL::text, p_account_number text DEFAULT NULL::text, p_amount numeric DEFAULT 0, p_note text DEFAULT NULL::text, p_save_beneficiary boolean DEFAULT false, p_swift_bic text DEFAULT NULL::text, p_iban text DEFAULT NULL::text, p_otp_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  src_account  RECORD;
  bene_id      UUID;
  tx_id        UUID;
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

  -- Optionally save beneficiary
  IF p_save_beneficiary AND p_beneficiary_id IS NULL THEN
    INSERT INTO public.beneficiaries (user_id, full_name, bank_name, account_number, swift_bic, iban)
    VALUES (p_user_id, p_beneficiary_name, p_bank_name, p_account_number, p_swift_bic, p_iban)
    RETURNING id INTO bene_id;
  ELSE
    bene_id := p_beneficiary_id;
  END IF;

  -- Deduct balance
  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_account_id;

  -- Generate reference
  ref_code := 'EXT-' || upper(substr(gen_random_uuid()::text, 1, 8));

  -- Record transaction
  INSERT INTO public.transactions (user_id, account_id, name, category, amount, type, note, created_at)
  VALUES (p_user_id, p_account_id, COALESCE(p_beneficiary_name, 'External Transfer'), 'Transfer', p_amount, 'debit', p_note, now())
  RETURNING id INTO tx_id;

  RETURN json_build_object(
    'ok',             TRUE,
    'tx_id',          tx_id,
    'reference',      ref_code,
    'beneficiary_id', bene_id,
    'amount',         p_amount
  );
END;
$function$;

-- transfer_funds: only the OTP-enforcing 6-arg version is kept.
-- (The legacy 5-arg overload from the original project bypassed the mandatory
--  transfer OTP and has been intentionally dropped.)
CREATE OR REPLACE FUNCTION public.transfer_funds(p_user_id uuid, p_from_id uuid, p_to_id uuid, p_amount numeric, p_note text DEFAULT NULL::text, p_otp_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.store_phone_otp(p_phone text, p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.phone_otps
  SET used = TRUE
  WHERE user_id = auth.uid() AND used = FALSE;

  INSERT INTO public.phone_otps (user_id, phone, code)
  VALUES (auth.uid(), p_phone, p_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_phone_otp(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  otp_record RECORD;
BEGIN
  SELECT * INTO otp_record
  FROM public.phone_otps
  WHERE user_id = auth.uid()
    AND code    = p_code
    AND used    = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid or already-used code.');
  END IF;

  UPDATE public.phone_otps SET used = TRUE WHERE id = otp_record.id;

  UPDATE public.profiles
  SET phone_verified = TRUE
  WHERE id = auth.uid();

  RETURN json_build_object('ok', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_get_settings()
 RETURNS TABLE(key text, value text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT key, value, updated_at FROM public.admin_settings ORDER BY key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.webhook_update_deposit(p_payment_id text, p_status text, p_tx_hash text DEFAULT NULL::text, p_confirmations integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_id uuid;
begin
  update public.crypto_deposits
     set status        = p_status::public.deposit_status,
         tx_hash       = coalesce(p_tx_hash, tx_hash),
         confirmations = p_confirmations
   where payment_id = p_payment_id
     and status not in ('credited', 'rejected', 'expired')
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'Deposit not found or already finalised.');
  end if;

  return jsonb_build_object('ok', true, 'deposit_id', v_id);
end;
$function$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER set_crypto_deposits_updated_at BEFORE UPDATE ON public.crypto_deposits FOR EACH ROW EXECUTE FUNCTION set_deposit_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_card_payment_updated_at BEFORE UPDATE ON public.card_payments FOR EACH ROW EXECUTE FUNCTION set_card_payment_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;  -- locked to SECURITY DEFINER access only (no policies)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_otps ENABLE ROW LEVEL SECURITY;

-- ── Policies ─────────────────────────────────────────────────────────────────
CREATE POLICY "Admins can insert support messages" ON public.support_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can read support messages" ON public.support_messages AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can read support requests" ON public.support_requests AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can update support requests" ON public.support_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can check own admin status" ON public.admins AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can create own deposits" ON public.crypto_deposits AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own beneficiaries" ON public.beneficiaries AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own investments" ON public.investments AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own savings goals" ON public.savings_goals AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own accounts" ON public.accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own beneficiaries" ON public.beneficiaries AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own card payments" ON public.card_payments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own cards" ON public.cards AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own external transfers" ON public.external_transfers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own investments" ON public.investments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can insert own savings goals" ON public.savings_goals AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own transactions" ON public.transactions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own accounts" ON public.accounts AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own beneficiaries" ON public.beneficiaries AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own cards" ON public.cards AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own investments" ON public.investments AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own savings goals" ON public.savings_goals AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own accounts" ON public.accounts AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own beneficiaries" ON public.beneficiaries AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own card payments" ON public.card_payments AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own cards" ON public.cards AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own deposits" ON public.crypto_deposits AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own external transfers" ON public.external_transfers AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own investments" ON public.investments AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can view own savings goals" ON public.savings_goals AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own transactions" ON public.transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
