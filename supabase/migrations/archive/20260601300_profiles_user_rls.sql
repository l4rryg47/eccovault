-- Allow a newly signed-up authenticated user to insert their own profile row.
-- Postgres evaluates WITH CHECK on the INSERT path of an upsert (ON CONFLICT DO UPDATE),
-- so this policy is required even when the auth trigger has already created the row.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile row.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
