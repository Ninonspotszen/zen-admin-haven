CREATE OR REPLACE FUNCTION public.register_spot_visit(p_id uuid, p_visitor uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_duree integer;
  v_mode text;
  v_acces public.acces_spots%ROWTYPE;
  v_fin timestamptz;
BEGIN
  SELECT c.duree_acces_jours, coalesce(c.mode_acces, 'qr_libre') INTO v_duree, v_mode
  FROM public.spots s LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_id AND s.statut = 'actif';
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'spot_inactif');
  END IF;

  SELECT * INTO v_acces FROM public.acces_spots
  WHERE uuid_visiteur = p_visitor AND spot_id = p_id
  ORDER BY premiere_visite DESC LIMIT 1;

  IF FOUND THEN
    v_fin := v_acces.premiere_visite + make_interval(days => COALESCE(v_acces.duree_acces_jours, v_duree, 7));
    IF v_mode = 'email_domaine' OR now() < v_fin THEN
      RETURN json_build_object('ok', true, 'premiere_visite', v_acces.premiere_visite, 'duree_acces_jours', COALESCE(v_acces.duree_acces_jours, v_duree, 7));
    ELSIF now() < v_fin + interval '30 days' THEN
      RETURN json_build_object('ok', false, 'reason', 'acces_expire');
    END IF;
  END IF;

  INSERT INTO public.acces_spots (uuid_visiteur, spot_id, duree_acces_jours)
  VALUES (p_visitor, p_id, COALESCE(v_duree, 7));
  RETURN json_build_object('ok', true, 'premiere_visite', now(), 'duree_acces_jours', COALESCE(v_duree, 7));
END;
$function$;