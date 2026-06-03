-- Profile self-editing (with admin re-approval) + avatars.
--
-- Two RPCs:
--
-- 1. submit_profile_update — called by the user from the dashboard Profile page.
--    Writes the user's own full_name / avatar_url / profile_data and forces
--    approval_status back to 'pending' so an admin must re-approve the edited
--    profile before the account regains full access. SECURITY DEFINER so the
--    pending flip is enforced server-side regardless of the (broad) profiles
--    UPDATE RLS policy, and keyed to auth.uid() so a user can only edit their
--    own row.
--
-- 2. admin_update_profile — called by an admin from the user detail modal to
--    edit a user's full_name / avatar_url / profile_data. Admin edits do NOT
--    change approval_status. SECURITY DEFINER + is_admin() guard.
--
-- Both shallow-merge the incoming profile_data over the existing JSON so keys
-- that aren't being edited (e.g. kyc_documents) are preserved.

CREATE OR REPLACE FUNCTION public.submit_profile_update(
  p_full_name    text,
  p_profile_data jsonb,
  p_avatar_url   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  UPDATE public.profiles
  SET full_name       = COALESCE(p_full_name, full_name),
      avatar_url      = COALESCE(p_avatar_url, avatar_url),
      profile_data    = COALESCE(profile_data, '{}'::jsonb) || COALESCE(p_profile_data, '{}'::jsonb),
      approval_status = 'pending',
      updated_at      = now()
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id      uuid,
  p_full_name    text  DEFAULT NULL,
  p_avatar_url   text  DEFAULT NULL,
  p_profile_data jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'Admin access required');
  END IF;

  UPDATE public.profiles
  SET full_name    = COALESCE(p_full_name, full_name),
      avatar_url   = COALESCE(p_avatar_url, avatar_url),
      profile_data = COALESCE(profile_data, '{}'::jsonb) || COALESCE(p_profile_data, '{}'::jsonb),
      updated_at   = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;

-- Surface avatar_url in the admin user list so the user detail modal can show
-- (and edit) each user's photo. Return type changes, so drop first.
DROP FUNCTION IF EXISTS admin_get_users();

CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  full_name       TEXT,
  avatar_url      TEXT,
  has_profile     BOOLEAN,
  created_at      TIMESTAMPTZ,
  account_count   BIGINT,
  total_balance   NUMERIC,
  approval_status TEXT,
  profile_data    JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    TRUE                          AS has_profile,
    p.created_at,
    COUNT(a.id)                   AS account_count,
    COALESCE(SUM(a.balance), 0)   AS total_balance,
    p.approval_status,
    p.profile_data::JSON
  FROM profiles p
  LEFT JOIN accounts a ON a.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.avatar_url, p.created_at, p.approval_status, p.profile_data
  ORDER BY p.created_at DESC;
END;
$$;
