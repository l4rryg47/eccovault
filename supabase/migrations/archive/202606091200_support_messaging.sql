-- Support messaging tables and admin RPCs

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  support_pin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pin_sent'
    CHECK (status IN ('pin_sent', 'open', 'pending_admin', 'resolved', 'closed')),
  pin_expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 minutes',
  opened_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS initial_message TEXT,
  ADD COLUMN IF NOT EXISTS support_pin TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pin_sent',
  ADD COLUMN IF NOT EXISTS pin_expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 minutes',
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  sender_email TEXT,
  body TEXT NOT NULL,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.support_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_type TEXT,
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS support_requests_pin_lookup
  ON public.support_requests (support_pin, email, status);

CREATE INDEX IF NOT EXISTS support_requests_status_last_message
  ON public.support_requests (status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_request_created
  ON public.support_messages (request_id, created_at ASC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read support requests" ON public.support_requests;
CREATE POLICY "Admins can read support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update support requests" ON public.support_requests;
CREATE POLICY "Admins can update support requests"
  ON public.support_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read support messages" ON public.support_messages;
CREATE POLICY "Admins can read support messages"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;
CREATE POLICY "Admins can insert support messages"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.admin_get_support_threads(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_support_threads(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  subject TEXT,
  initial_message TEXT,
  support_pin TEXT,
  status TEXT,
  pin_expires_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  message_count BIGINT,
  last_message_preview TEXT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.email,
    r.subject,
    r.initial_message,
    r.support_pin,
    r.status,
    r.pin_expires_at,
    r.opened_at,
    r.last_message_at,
    r.created_at,
    COUNT(m.id)::BIGINT AS message_count,
    COALESCE(
      (
        SELECT left(sm.body, 160)
        FROM public.support_messages sm
        WHERE sm.request_id = r.id
        ORDER BY sm.created_at DESC
        LIMIT 1
      ),
      left(r.initial_message, 160)
    )::TEXT AS last_message_preview
  FROM public.support_requests r
  LEFT JOIN public.support_messages m ON m.request_id = r.id
  WHERE p_status IS NULL OR r.status = p_status
  GROUP BY r.id
  ORDER BY r.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_get_support_messages(UUID);
CREATE OR REPLACE FUNCTION public.admin_get_support_messages(p_request_id UUID)
RETURNS TABLE (
  id UUID,
  request_id UUID,
  sender_type TEXT,
  sender_email TEXT,
  body TEXT,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.request_id,
    m.sender_type,
    m.sender_email,
    m.body,
    m.resend_email_id,
    m.created_at
  FROM public.support_messages m
  WHERE m.request_id = p_request_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_update_support_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_update_support_status(
  p_request_id UUID,
  p_status TEXT
)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unauthorized: Admin access required');
  END IF;

  IF p_status NOT IN ('pin_sent', 'open', 'pending_admin', 'resolved', 'closed') THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid status');
  END IF;

  UPDATE public.support_requests
  SET status = p_status,
      last_message_at = now()
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Support thread not found');
  END IF;

  RETURN json_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_support_threads(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_support_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_support_status(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
