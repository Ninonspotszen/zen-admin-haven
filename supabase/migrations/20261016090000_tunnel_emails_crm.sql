-- Tunnel emails + CRM (Spots Zen, 16/10/2026) — à exécuter une fois dans le SQL Editor de Supabase.
-- Idempotent : peut être relancé sans effet de bord. Aucun email n'est envoyé par ce script.
--
-- 1. abonnes_b2c : dernière connexion, langue réellement utilisée, consentement newsletter
-- 2. emails_automatiques : journal des emails du robot quotidien (et garde-fou anti-doublon)
-- 3. contact_requests : pipeline commercial B2B (étapes, note, prochaine action, client lié)
-- 4. spot_leads : visiteurs d'un spot qui demandent à recevoir le lien chez eux

-- 1. Abonnés ----------------------------------------------------------------------------
ALTER TABLE public.abonnes_b2c
  ADD COLUMN IF NOT EXISTS derniere_connexion timestamptz,
  ADD COLUMN IF NOT EXISTS newsletter_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_ok_le timestamptz, -- preuve du consentement (RGPD art. 7.1)
  -- La personne a répondu « STOP » : plus d'emails d'accompagnement (J+3, relance, J-7, fin d'accès).
  -- Les emails obligatoires (paiement, résiliation, rappel annuel L.215-1) continuent.
  ADD COLUMN IF NOT EXISTS emails_stop boolean NOT NULL DEFAULT false;

-- Appelée par la bibliothèque à chaque ouverture : note la visite et la langue choisie.
-- SECURITY DEFINER limité à la ligne de l'utilisateur connecté et à ces deux colonnes.
CREATE OR REPLACE FUNCTION public.enregistrer_visite(p_langue text)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  UPDATE public.abonnes_b2c
     SET derniere_connexion = now(),
         langue_preferee = CASE WHEN p_langue IN ('fr','en','de','nl','es') THEN p_langue ELSE langue_preferee END
   WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.enregistrer_visite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_visite(text) TO authenticated;

-- Case « Recevoir les nouvelles de Spots Zen » dans Mon abonnement.
CREATE OR REPLACE FUNCTION public.changer_newsletter(p_ok boolean)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  UPDATE public.abonnes_b2c
     SET newsletter_ok = p_ok,
         newsletter_ok_le = CASE WHEN p_ok THEN now() ELSE NULL END
   WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.changer_newsletter(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.changer_newsletter(boolean) TO authenticated;

-- 2. Journal des emails automatiques ------------------------------------------------------
-- cle = identifiant unique de l'envoi (ex. « acces_j7:<abonné>:<date de fin> ») :
-- l'index unique empêche d'envoyer deux fois le même email, même si le robot repasse.
CREATE TABLE IF NOT EXISTS public.emails_automatiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  cle text NOT NULL,
  destinataire text NOT NULL,
  abonne_id uuid,
  langue text,
  statut text NOT NULL DEFAULT 'en_cours', -- en_cours / sent / disabled / failed
  detail text
);
CREATE UNIQUE INDEX IF NOT EXISTS emails_automatiques_cle_key ON public.emails_automatiques (cle);
CREATE INDEX IF NOT EXISTS emails_automatiques_created_idx ON public.emails_automatiques (created_at DESC);
ALTER TABLE public.emails_automatiques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read emails automatiques" ON public.emails_automatiques;
CREATE POLICY "Admins read emails automatiques" ON public.emails_automatiques
FOR SELECT TO authenticated USING (public.is_admin());
GRANT SELECT ON public.emails_automatiques TO authenticated;
-- Pas de politique d'écriture : seul le serveur (clé service) écrit.

-- 3. Pipeline B2B -----------------------------------------------------------------------
-- Les valeurs existantes (nouvelle, en_cours, traitee) restent valides : aucune donnée à migrer.
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS prochaine_action date,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accuse_reception text; -- sent / disabled / failed

ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_statut_check;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_statut_check
  CHECK (statut IN ('nouvelle', 'en_cours', 'demo', 'devis', 'pilote', 'client', 'perdue', 'traitee'));

-- Le visiteur du formulaire ne peut toujours rien pré-remplir côté suivi.
DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  secteur IS NOT NULL AND length(secteur) BETWEEN 1 AND 100 AND statut = 'nouvelle'
  AND notification IS NULL AND accuse_reception IS NULL AND note IS NULL
  AND prochaine_action IS NULL AND client_id IS NULL
);

-- 4. Visiteurs des spots ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spot_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  spot_id uuid REFERENCES public.spots(id) ON DELETE SET NULL,
  langue text,
  newsletter_ok boolean NOT NULL DEFAULT false, -- case cochée par la personne (jamais pré-cochée)
  email_statut text -- sent / disabled / failed
);
-- Un même email ne reçoit le lien qu'une fois par spot.
CREATE UNIQUE INDEX IF NOT EXISTS spot_leads_email_spot_key ON public.spot_leads (lower(email), spot_id);
ALTER TABLE public.spot_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read spot leads" ON public.spot_leads;
CREATE POLICY "Admins read spot leads" ON public.spot_leads
FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins delete spot leads" ON public.spot_leads;
CREATE POLICY "Admins delete spot leads" ON public.spot_leads
FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT, DELETE ON public.spot_leads TO authenticated;
-- Pas de politique d'insertion : le formulaire passe par le serveur (clé service), qui filtre les robots.
