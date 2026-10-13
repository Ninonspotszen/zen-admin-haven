CREATE OR REPLACE FUNCTION public.get_library_catalog()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.abonnes_b2c WHERE id = auth.uid() AND statut IN ('actif','offert','ambassadeur')) THEN
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

CREATE OR REPLACE FUNCTION public.get_spot_catalog(p_id uuid, p_pin text)
 RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.spots s LEFT JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_id AND s.statut = 'actif'
      AND CASE WHEN coalesce(c.mode_acces, 'qr_libre') = 'email_domaine'
               THEN public.spot_email_ok(p_id)
               ELSE (s.pin_code IS NULL OR s.pin_code = p_pin) END
  ) THEN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordre), '[]'::json)
    FROM (
      SELECT a.id, a.type, a.moment, a.public_cible, a.image_url, a.duree_secondes,
             a.musique_suite_id, a.titre_fr,
             sa.ordre, sa.mis_en_avant, sa.mis_en_avant_moment,
             (
               SELECT json_agg(json_build_object(
                 'langue', tr.langue, 'voix', tr.voix, 'titre', tr.titre,
                 'description', tr.description, 'cloudinary_url', tr.cloudinary_url
               ))
               FROM public.audios_traductions tr
               WHERE tr.audio_id = a.id
             ) AS traductions
      FROM public.spot_audios sa
      JOIN public.audios a ON a.id = sa.audio_id
      WHERE sa.spot_id = p_id
        AND sa.actif = true
        AND a.statut = 'publié'
        AND NOT EXISTS (
          SELECT 1 FROM public.client_audios ca
          WHERE ca.audio_id = a.id AND ca.client_id = sa.client_id AND ca.visible = false
        )
    ) t
  ) ELSE NULL END
$function$;