-- Admin settings table for customizable messages

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow only admins via RPCs; table may be read by authenticated clients via RPCs
CREATE OR REPLACE FUNCTION public.admin_get_settings()
RETURNS TABLE (key TEXT, value TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT s.key, s.value, s.updated_at FROM public.admin_settings AS s ORDER BY s.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key TEXT, p_value TEXT)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN json_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_setting(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
