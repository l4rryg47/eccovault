-- Add is_admin flag to profiles and public.is_admin() helper

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Function to determine whether the current caller is an admin.
-- Checks both auth user metadata and the profiles.is_admin flag.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';
