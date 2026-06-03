-- Add profile onboarding data storage for admin-created users

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB NULL;

NOTIFY pgrst, 'reload schema';
