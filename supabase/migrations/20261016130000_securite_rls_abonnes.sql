-- Audit sécurité du 16/10/2026 (Spots Zen) — à exécuter une fois dans le SQL Editor de Supabase.
-- Idempotent. Ne supprime aucune donnée.
--
-- 1. FAILLE CRITIQUE corrigée : la règle « abonne_own_account » (FOR ALL) laissait un utilisateur connecté
--    MODIFIER ou CRÉER sa propre ligne dans abonnes_b2c, donc s'attribuer statut = 'actif' et ouvrir la
--    bibliothèque sans payer (la bibliothèque vérifie ce statut). Désormais : lecture seule de sa ligne.
--    Les écritures légitimes passent ailleurs et ne sont pas touchées :
--      - webhook Stripe et accès offerts : serveur (clé service) ;
--      - fiche abonné de l'admin : règle admin_all_abonnes_b2c ;
--      - dernière visite, langue, newsletter : fonctions enregistrer_visite / changer_newsletter
--        (SECURITY DEFINER, limitées à ces colonnes).
-- 2. contact_requests : le formulaire passe par le serveur (clé service), qui applique la limite anti-abus.
--    L'insertion directe depuis le navigateur ne servait plus et permettait de contourner cette limite.

-- 1. Abonnés : lecture seule de sa propre ligne
DROP POLICY IF EXISTS "abonne_own_account" ON public.abonnes_b2c;
DROP POLICY IF EXISTS "abonne_read_own_account" ON public.abonnes_b2c;
CREATE POLICY "abonne_read_own_account" ON public.abonnes_b2c
FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2. Demandes B2B : plus d'insertion directe depuis le navigateur
DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;

-- Contrôle : doit afficher abonne_read_own_account (SELECT) et admin_all_abonnes_b2c (ALL),
-- et plus aucune règle INSERT sur contact_requests.
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('abonnes_b2c', 'contact_requests')
ORDER BY tablename, cmd;
