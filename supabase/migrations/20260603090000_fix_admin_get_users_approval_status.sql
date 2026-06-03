-- Restore approval_status (and profile_data) to admin_get_users().
-- The live baseline version of this RPC omits approval_status, so the admin
-- user list received approval_status = undefined for every row and the UI
-- fell back to showing everyone as "pending" regardless of the real value.
-- Drop first because the return type is changing (new columns).

DROP FUNCTION IF EXISTS admin_get_users();

CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  full_name       TEXT,
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
