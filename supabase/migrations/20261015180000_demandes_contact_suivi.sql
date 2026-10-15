-- Suivi des demandes du formulaire /professionnels (Spots Zen, 15/10/2026) — à exécuter une fois dans le SQL Editor.
-- Avant : les demandes étaient enregistrées mais personne n'était prévenu et l'admin ne les affichait pas.
-- Idempotent : peut être relancé sans effet de bord.

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'nouvelle',
  ADD COLUMN IF NOT EXISTS notification text; -- résultat de l'email d'alerte à Ninon : sent / disabled / failed

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_statut_check') THEN
    ALTER TABLE public.contact_requests
      ADD CONSTRAINT contact_requests_statut_check CHECK (statut IN ('nouvelle', 'en_cours', 'traitee'));
  END IF;
END $$;

-- L'admin peut changer le statut d'une demande (lecture et suppression existaient déjà).
GRANT UPDATE ON public.contact_requests TO authenticated;
DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;
CREATE POLICY "Admins can update contact requests" ON public.contact_requests
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Le visiteur qui remplit le formulaire ne peut ni choisir le statut ni le résultat de l'alerte.
DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests
FOR INSERT TO anon, authenticated
WITH CHECK (secteur IS NOT NULL AND length(secteur) BETWEEN 1 AND 100 AND statut = 'nouvelle' AND notification IS NULL);

-- Temps réel : une nouvelle demande apparaît dans l'admin sans recharger.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contact_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_requests;
  END IF;
END $$;
