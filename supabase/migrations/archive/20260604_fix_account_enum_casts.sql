-- Fix enum-to-text type mismatches in admin_get_all_accounts
DROP FUNCTION IF EXISTS public.admin_get_all_accounts() CASCADE;
CREATE OR REPLACE FUNCTION public.admin_get_all_accounts()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  type TEXT,
  balance NUMERIC,
  account_number TEXT,
  status TEXT,
  account_state TEXT,
  transaction_limit NUMERIC,
  requires_transfer_otp BOOLEAN,
  hold_reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.name,
    a.type::TEXT,
    a.balance,
    a.account_number,
    a.status::TEXT,
    COALESCE(a.account_state, a.status::TEXT) AS account_state,
    a.transaction_limit,
    a.requires_transfer_otp,
    a.hold_reason,
    a.created_at
  FROM public.accounts a
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.admin_get_all_accounts() TO authenticated;
NOTIFY pgrst, 'reload schema';
