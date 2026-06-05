-- Transfer OTP flow: email-based instead of admin-generated.
-- Update the default error message shown when no OTP is supplied.
INSERT INTO public.admin_settings (key, value, updated_at)
VALUES (
  'error_transfer_otp_required',
  'A transfer OTP is required. Enter the code sent to your registered email address.',
  NOW()
)
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;
