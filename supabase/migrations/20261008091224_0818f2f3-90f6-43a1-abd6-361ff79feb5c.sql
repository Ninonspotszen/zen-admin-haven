-- 1. Infos publiques d'un spot (sans le PIN)
CREATE OR REPLACE FUNCTION public.get_spot_public(p_id uuid)
RETURNS TABLE (
  id uuid,
  nom text,
  description text,
  photo_url text,
  adresse text,
  statut text,
  client_nom text,
  duree_acces_jours integer,
  mode_acces text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.nom, s.description, s.photo_url, s.adresse, s.statut,
         c.nom AS client_nom, c.duree_acces_jours, c.mode_acces
  FROM public.spots s
  LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_id AND s.statut = 'actif'
$$;

-- 2. Vérification du PIN côté serveur
CREATE OR REPLACE FUNCTION public.verify_spot_pin(p_id uuid, p_pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots
    WHERE id = p_id AND statut = 'actif' AND pin_code = p_pin
  )
$$;

-- 3. Catalogue audio d'un spot (uniquement si le PIN est correct)
CREATE OR REPLACE FUNCTION public.get_spot_catalog(p_id uuid, p_pin text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.verify_spot_pin(p_id, p_pin) THEN (
    SELECT json_agg(row_to_json(t) ORDER BY t.ordre)
    FROM (
      SELECT a.id, a.type, a.moment, a.image_url, a.duree_secondes,
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
$$;

-- 4. Infos publiques d'un audio avec ses traductions
CREATE OR REPLACE FUNCTION public.get_audio_public(p_audio uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', a.id,
    'type', a.type,
    'moment', a.moment,
    'image_url', a.image_url,
    'duree_secondes', a.duree_secondes,
    'musique_suite_id', a.musique_suite_id,
    'titre_fr', a.titre_fr,
    'traductions', (
      SELECT json_agg(json_build_object(
        'langue', tr.langue, 'voix', tr.voix, 'titre', tr.titre,
        'description', tr.description, 'cloudinary_url', tr.cloudinary_url
      ))
      FROM public.audios_traductions tr
      WHERE tr.audio_id = a.id
    )
  )
  FROM public.audios a
  WHERE a.id = p_audio AND a.statut = 'publié'
$$;

-- 5. Enregistrement d'une visite (contrôle de la période d'accès)
CREATE OR REPLACE FUNCTION public.register_spot_visit(p_id uuid, p_visitor uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duree integer;
  v_acces public.acces_spots%ROWTYPE;
BEGIN
  SELECT c.duree_acces_jours INTO v_duree
  FROM public.spots s
  LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_id AND s.statut = 'actif';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'spot_inactif');
  END IF;

  SELECT * INTO v_acces
  FROM public.acces_spots
  WHERE uuid_visiteur = p_visitor AND spot_id = p_id
  LIMIT 1;

  IF FOUND THEN
    IF v_acces.premiere_visite + make_interval(days => COALESCE(v_acces.duree_acces_jours, v_duree, 7)) < now() THEN
      RETURN json_build_object('ok', false, 'reason', 'acces_expire');
    END IF;
    RETURN json_build_object('ok', true, 'premiere_visite', v_acces.premiere_visite, 'duree_acces_jours', COALESCE(v_acces.duree_acces_jours, v_duree, 7));
  END IF;

  INSERT INTO public.acces_spots (uuid_visiteur, spot_id, duree_acces_jours)
  VALUES (p_visitor, p_id, COALESCE(v_duree, 7));

  RETURN json_build_object('ok', true, 'premiere_visite', now(), 'duree_acces_jours', COALESCE(v_duree, 7));
END;
$$;

-- Grants sur les fonctions
GRANT EXECUTE ON FUNCTION public.get_spot_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_spot_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_spot_catalog(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_audio_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_spot_visit(uuid, uuid) TO anon, authenticated;

-- 6. Le PIN n'est plus lisible par les anonymes
REVOKE SELECT (pin_code) ON public.spots FROM anon;

-- 7. Les visiteurs n'écrivent/lisent plus directement dans acces_spots
DROP POLICY IF EXISTS anon_insert_acces_spots ON public.acces_spots;
DROP POLICY IF EXISTS anon_read_acces_spots ON public.acces_spots;