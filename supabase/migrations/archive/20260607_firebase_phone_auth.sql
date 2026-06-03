-- Migration to switch from Twilio OTP to Firebase phone auth
-- Removes custom phone OTP infrastructure; keeps phone_verified column for gating

-- Drop the custom OTP RPCs
DROP FUNCTION IF EXISTS public.store_phone_otp(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.verify_phone_otp(TEXT) CASCADE;

-- Drop the OTP storage table
DROP TABLE IF EXISTS public.phone_otps CASCADE;

-- phone_verified column remains on profiles for gating dashboard access
-- Firebase phone auth verification will update this flag via the client

NOTIFY pgrst, 'reload schema';
