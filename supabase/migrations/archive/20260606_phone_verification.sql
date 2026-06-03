-- Phone verification via SMS (Twilio)
-- Adds phone_verified flag to profiles and two RPCs:
--   request_phone_verification(p_phone) → stores a 6-digit OTP in phone_otps
--   verify_phone_otp(p_code)            → validates and marks phone_verified = true

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin-created users skip phone verification (they're already approved)
UPDATE public.profiles
SET phone_verified = TRUE
WHERE approval_status = 'approved';

-- OTP storage table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otps_user_id_idx ON public.phone_otps(user_id);

-- RPC: store a new OTP (called by the Edge Function after sending SMS)
DROP FUNCTION IF EXISTS public.store_phone_otp(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.store_phone_otp(p_phone TEXT, p_code TEXT)
RETURNS VOID AS $$
BEGIN
  -- Invalidate previous unused OTPs for this user
  UPDATE public.phone_otps
  SET used = TRUE
  WHERE user_id = auth.uid() AND used = FALSE;

  INSERT INTO public.phone_otps (user_id, phone, code)
  VALUES (auth.uid(), p_phone, p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.store_phone_otp(TEXT, TEXT) TO authenticated;

-- RPC: verify an OTP submitted by the user
DROP FUNCTION IF EXISTS public.verify_phone_otp(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.verify_phone_otp(p_code TEXT)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_phone_otp(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
