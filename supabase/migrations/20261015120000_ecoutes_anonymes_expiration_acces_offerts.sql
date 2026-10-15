-- Nettoyage du 15/10/2026 (Spots Zen) — à exécuter une fois dans le SQL Editor de Supabase.
-- Idempotent : peut être relancé sans effet de bord.

-- 1. Écoutes anonymes (décision RGPD du 18/09/2026) -----------------------------------
-- Trois règles citaient user_id : on les retire ou on les réécrit d'abord, sinon la
-- suppression de la colonne échoue. ecoutes_insert_own et ecoutes_select_own (créées hors
-- repo) n'avaient de sens qu'avec des écoutes nominatives et n'étaient lues par aucune page ;
-- ecoutes_insert_own ne vérifiait en plus pas que l'audio était publié.
DROP POLICY IF EXISTS "ecoutes_insert_own" ON public.ecoutes;
DROP POLICY IF EXISTS "ecoutes_select_own" ON public.ecoutes;
DROP POLICY IF EXISTS "anon_insert_ecoutes" ON public.ecoutes;
CREATE POLICY "anon_insert_ecoutes" ON public.ecoutes
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.audios a WHERE a.id = audio_id AND a.statut = 'publié')
);

-- Pas de CASCADE : si un autre objet dépendait encore de user_id, Postgres refuse
-- (message d'erreur) au lieu de supprimer cet objet en silence.
ALTER TABLE public.ecoutes DROP COLUMN IF EXISTS user_id;

-- 2. Expiration des accès offerts / ambassadeurs ---------------------------------------
-- Avant : le statut suffisait, l'accès ne s'arrêtait jamais. Désormais « offert » et
-- « ambassadeur » ne donnent accès que jusqu'à date_fin_acces (incluse).
CREATE OR REPLACE FUNCTION public.get_library_catalog()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.abonnes_b2c
    WHERE id = auth.uid()
      AND (
        statut IN ('actif', 'paiement_echoue')
        OR (statut IN ('offert', 'ambassadeur') AND date_fin_acces >= current_date)
      )
  ) THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordre NULLS LAST), '[]'::json)
    FROM (
      SELECT a.id, a.slug, a.type, a.moment, a.public_cible, a.image_url, a.duree_secondes, a.musique_suite_id, a.titre_fr,
             a.ordre, NULL::boolean AS mis_en_avant, NULL::text AS mis_en_avant_moment,
             (SELECT json_agg(json_build_object('langue', tr.langue, 'voix', tr.voix, 'titre', tr.titre,
                      'description', tr.description, 'cloudinary_url', tr.cloudinary_url))
              FROM public.audios_traductions tr WHERE tr.audio_id = a.id) AS traductions
      FROM public.audios a WHERE a.statut = 'publié'
      ORDER BY a.ordre NULLS LAST LIMIT 200
    ) t
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_library_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_library_catalog() TO authenticated;
