-- ─── User approval status ────────────────────────────────────────────────────
-- Adds approval_status to profiles and an admin RPC to change it.
-- Existing rows are backfilled as 'approved' so current users keep access.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'suspended', 'frozen', 'on_hold'));

-- Backfill: mark all existing profiles as approved
UPDATE profiles SET approval_status = 'approved' WHERE TRUE;

-- ─── admin_set_user_status ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_set_user_status(
  p_user_id UUID,
  p_status   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'Admin access required');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'suspended', 'frozen', 'on_hold') THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid status value');
  END IF;

  UPDATE profiles
  SET    approval_status = p_status,
         updated_at      = NOW()
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ─── Expose approval_status in admin_get_users ───────────────────────────────
-- Drop first because the return type is changing (new columns).

DROP FUNCTION IF EXISTS admin_get_users();

CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id             UUID,
  email          TEXT,
  full_name      TEXT,
  has_profile    BOOLEAN,
  created_at     TIMESTAMPTZ,
  account_count  BIGINT,
  total_balance  NUMERIC,
  approval_status TEXT,
  profile_data   JSON
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
    TRUE                          AS has_profile,
    p.created_at,
    COUNT(a.id)                   AS account_count,
    COALESCE(SUM(a.balance), 0)   AS total_balance,
    p.approval_status,
    p.profile_data::JSON
  FROM profiles p
  LEFT JOIN accounts a ON a.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.created_at, p.approval_status, p.profile_data
  ORDER BY p.created_at DESC;
END;
$$;
