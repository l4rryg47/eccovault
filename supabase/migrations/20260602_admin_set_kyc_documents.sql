-- Persist KYC document URLs into profiles.profile_data.
--
-- The admin "Create user" flow uploads documents to Cloudinary client-side
-- (it needs the new user id for the folder name) and then tried to save the
-- resulting URLs with a direct client UPDATE on the *new* user's profile row.
-- That UPDATE runs under the admin's own session, but RLS on profiles only
-- permits a user to update their own row — so it silently affected 0 rows and
-- the documents were never stored. (A 0-row UPDATE returns no error.)
--
-- This admin-only SECURITY DEFINER RPC merges the document list into the
-- existing profile_data without overwriting other keys (phone, address, …).

CREATE OR REPLACE FUNCTION admin_set_kyc_documents(p_user_id UUID, p_docs JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE profiles
  SET profile_data = COALESCE(profile_data, '{}'::JSONB)
                     || jsonb_build_object('kyc_documents', p_docs)
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
