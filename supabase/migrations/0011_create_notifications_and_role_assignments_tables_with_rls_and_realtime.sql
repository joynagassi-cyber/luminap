-- Create role_assignments table
CREATE TABLE IF NOT EXISTS public.role_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('PASTEUR', 'SECRETAIRE', 'TREASURIER', 'COMPTABLE', 'TREASURIER_ADJOINT', 'SECRETAIRE_ADJOINT')),
  org_id text NOT NULL DEFAULT 'org-1',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(session_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  action_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  source_transaction_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.role_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.role_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;

-- RLS policies
CREATE POLICY "role_assignments_insert" ON public.role_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "role_assignments_select" ON public.role_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_assignments_update" ON public.role_assignments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_assignments;