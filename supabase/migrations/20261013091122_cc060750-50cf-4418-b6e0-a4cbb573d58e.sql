DROP POLICY IF EXISTS "read_traductions_published" ON public.audios_traductions;
CREATE POLICY "admin_read_traductions" ON public.audios_traductions FOR SELECT TO authenticated USING (public.is_admin());

REVOKE EXECUTE ON FUNCTION public.get_audio_public(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_abonne_on_signup() FROM PUBLIC, anon, authenticated;
DROP TABLE IF EXISTS public.kv_store_b6181f40;

CREATE OR REPLACE FUNCTION public.get_library_catalog()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.abonnes_b2c WHERE id = auth.uid() AND statut IN ('actif','offert','ambassadeur')) THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordre NULLS LAST), '[]'::json)
    FROM (
      SELECT a.id, a.slug, a.type, a.moment, a.image_url, a.duree_secondes, a.musique_suite_id, a.titre_fr,
             a.ordre, NULL::boolean AS mis_en_avant, NULL::text AS mis_en_avant_moment,
             (SELECT json_agg(json_build_object('langue', tr.langue, 'voix', tr.voix, 'titre', tr.titre,
                      'description', tr.description, 'cloudinary_url', tr.cloudinary_url))
              FROM public.audios_traductions tr WHERE tr.audio_id = a.id) AS traductions
      FROM public.audios a WHERE a.statut = 'publié'
      ORDER BY a.ordre NULLS LAST LIMIT 200
    ) t
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_library_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_library_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_titles(p_audio_ids uuid[])
RETURNS TABLE(audio_id uuid, langue text, titre text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tr.audio_id, tr.langue, tr.titre
  FROM public.audios_traductions tr JOIN public.audios a ON a.id = tr.audio_id
  WHERE tr.audio_id = ANY(p_audio_ids) AND a.statut = 'publié'
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_titles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_titles(uuid[]) TO anon, authenticated;