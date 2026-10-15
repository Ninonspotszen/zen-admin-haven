-- Dashboard admin en temps réel (Spots Zen, 15/10/2026) — à exécuter une fois dans le SQL Editor de Supabase.
-- Livrable 8 du jury : « 3 visualisations connectées à Supabase en temps réel, accès restreint par rôle ».
-- Idempotent : peut être relancé sans effet de bord.

-- 1. Lecture réservée aux admins pour les tables lues par le dashboard.
--    (Supabase Realtime n'envoie un changement qu'aux utilisateurs qui ont le droit de lire la ligne.)
DROP POLICY IF EXISTS "ecoutes_admin_select" ON public.ecoutes;
CREATE POLICY "ecoutes_admin_select" ON public.ecoutes
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "acces_spots_admin_select" ON public.acces_spots;
CREATE POLICY "acces_spots_admin_select" ON public.acces_spots
FOR SELECT TO authenticated USING (public.is_admin());

-- 2. Activation du temps réel sur les tables qui font bouger le dashboard.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ecoutes', 'acces_spots', 'abonnes_b2c'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
