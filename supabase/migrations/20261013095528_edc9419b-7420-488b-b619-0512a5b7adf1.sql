UPDATE public.clients SET mode_acces = 'qr_libre' WHERE mode_acces IS NULL;
UPDATE public.clients SET domaine_email = lower(trim(both '@' from trim(domaine_email))) WHERE domaine_email IS NOT NULL;
ALTER TABLE public.clients ALTER COLUMN mode_acces SET DEFAULT 'qr_libre';
ALTER TABLE public.clients ALTER COLUMN mode_acces SET NOT NULL;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_mode_acces_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_mode_acces_check CHECK (mode_acces IN ('qr_libre', 'email_domaine'));
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_domaine_email_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_domaine_email_check CHECK (
  mode_acces = 'qr_libre'
  OR (domaine_email IS NOT NULL AND domaine_email ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')
);

CREATE OR REPLACE FUNCTION public.spot_email_ok(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_id AND s.statut = 'actif'
      AND c.mode_acces = 'email_domaine'
      AND c.statut IN ('Pilote', 'Actif annuel')
      AND auth.uid() IS NOT NULL
      AND lower(substring(coalesce(auth.email(), '') from '@([^@]+)$')) = c.domaine_email
  )
$$;

CREATE OR REPLACE FUNCTION public.check_spot_email_domain(p_id uuid, p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_id AND s.statut = 'actif'
      AND c.mode_acces = 'email_domaine'
      AND c.statut IN ('Pilote', 'Actif annuel')
      AND trim(p_email) ~ '^[^@\s]+@[^@\s]+$'
      AND lower(substring(trim(p_email) from '@([^@]+)$')) = c.domaine_email
  )
$$;

DROP FUNCTION IF EXISTS public.get_spot_public(uuid);
CREATE FUNCTION public.get_spot_public(p_id uuid)
RETURNS TABLE (id uuid, nom text, description text, photo_url text, adresse text, statut text,
               client_nom text, duree_acces_jours integer, mode_acces text,
               domaine_email text, pin_requis boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.nom, s.description, s.photo_url, s.adresse, s.statut,
         c.nom, c.duree_acces_jours, coalesce(c.mode_acces, 'qr_libre'),
         CASE WHEN c.mode_acces = 'email_domaine' THEN c.domaine_email END,
         (s.pin_code IS NOT NULL AND coalesce(c.mode_acces, 'qr_libre') = 'qr_libre')
  FROM public.spots s LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_id AND s.statut = 'actif'
$$;

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
$function$;

CREATE OR REPLACE FUNCTION public.register_spot_visit(p_id uuid, p_visitor uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_duree integer;
  v_mode text;
  v_acces public.acces_spots%ROWTYPE;
BEGIN
  SELECT c.duree_acces_jours, coalesce(c.mode_acces, 'qr_libre') INTO v_duree, v_mode
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
    IF v_mode <> 'email_domaine'
       AND v_acces.premiere_visite + make_interval(days => COALESCE(v_acces.duree_acces_jours, v_duree, 7)) < now() THEN
      RETURN json_build_object('ok', false, 'reason', 'acces_expire');
    END IF;
    RETURN json_build_object('ok', true, 'premiere_visite', v_acces.premiere_visite, 'duree_acces_jours', COALESCE(v_acces.duree_acces_jours, v_duree, 7));
  END IF;

  INSERT INTO public.acces_spots (uuid_visiteur, spot_id, duree_acces_jours)
  VALUES (p_visitor, p_id, COALESCE(v_duree, 7));

  RETURN json_build_object('ok', true, 'premiere_visite', now(), 'duree_acces_jours', COALESCE(v_duree, 7));
END;
$function$;

REVOKE ALL ON FUNCTION public.spot_email_ok(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spot_email_ok(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.check_spot_email_domain(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_spot_email_domain(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_spot_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_public(uuid) TO anon, authenticated;