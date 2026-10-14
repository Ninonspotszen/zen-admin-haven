ALTER TABLE public.abonnes_b2c ADD COLUMN IF NOT EXISTS date_fin_prevue date NULL;
COMMENT ON COLUMN public.abonnes_b2c.date_fin_prevue IS 'Date à laquelle l''abonnement payant s''arrêtera suite à une résiliation demandée (cancel_at_period_end). NULL si aucune résiliation prévue.';

CREATE OR REPLACE FUNCTION public.get_library_catalog()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.abonnes_b2c WHERE id = auth.uid() AND statut IN ('actif','offert','ambassadeur','paiement_echoue')) THEN
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