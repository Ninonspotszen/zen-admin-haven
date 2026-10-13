DROP POLICY IF EXISTS "anon_read_spots" ON public.spots;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spots' AND policyname='admin_read_spots') THEN
    CREATE POLICY "admin_read_spots" ON public.spots FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='admin_read_clients') THEN
    CREATE POLICY "admin_read_clients" ON public.clients FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.spots, public.clients FROM anon;