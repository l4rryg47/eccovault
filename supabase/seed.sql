-- Seed data for a fresh project (optional).
-- These keys are read by transfer_funds() and send_external_transfer(); if absent
-- the functions fall back to hard-coded defaults, so this is purely for convenience
-- so an admin sees editable rows in the AdminSettings page.

INSERT INTO public.admin_settings (key, value) VALUES
  ('error_account_inactive',       'Transfers are not allowed from inactive accounts. Please contact support.'),
  ('error_account_on_hold',        'Your account is currently on hold. Please contact your account manager.'),
  ('error_account_suspended',      'Your account has been suspended. Please contact support.'),
  ('error_transfer_otp_required',  'A transfer OTP is required. Please contact your account manager to obtain one.')
ON CONFLICT (key) DO NOTHING;
