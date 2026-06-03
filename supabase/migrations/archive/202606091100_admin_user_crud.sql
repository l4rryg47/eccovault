-- Admin User CRUD RPC Functions
-- Run this script in your Supabase SQL Editor to create the required admin functions

-- ─── Admin Create User ────────────────────────────────────────
-- Creates a new auth user and corresponding profile
-- Requires: User must be an admin (enforced by row-level security)
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Admin Update User ────────────────────────────────────────
-- Updates user profile details
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Admin Delete User ────────────────────────────────────────
-- Deletes a user and their profile
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (they can call these)
-- The functions will check admin status internally
GRANT EXECUTE ON FUNCTION admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;

-- ─── Admin Get Users ──────────────────────────────────────────
-- Fetches all users with account count and balance
-- Requires: User must be an admin
DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  has_profile BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  account_count BIGINT,
  total_balance NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

NOTIFY pgrst, 'reload schema';
