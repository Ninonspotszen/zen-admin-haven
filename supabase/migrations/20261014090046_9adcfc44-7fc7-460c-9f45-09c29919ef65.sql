CREATE OR REPLACE FUNCTION public.spot_assign_default_audios()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO spot_audios (spot_id, audio_id, client_id, actif, ordre, mis_en_avant, mis_en_avant_moment)
  SELECT NEW.id, a.id, NEW.client_id, true,
         row_number() OVER (ORDER BY a.ordre NULLS LAST, a.titre_fr),
         false, NULL
  FROM audios a
  WHERE a.statut = 'publié'
    AND NOT EXISTS (SELECT 1 FROM client_audios ca
                    WHERE ca.client_id = NEW.client_id AND ca.audio_id = a.id AND ca.visible = false)
    AND NOT EXISTS (SELECT 1 FROM spot_audios sa WHERE sa.spot_id = NEW.id AND sa.audio_id = a.id);

  UPDATE spot_audios SET mis_en_avant = true, mis_en_avant_moment = m.moment
  FROM (VALUES ('reveil-du-corps-f', 'Matin'),
               ('sieste-reparatrice-f', 'Journée'),
               ('songe-du-soir-orage-f', 'Soir'),
               ('glisser-vers-le-sommeil-f', 'Nuit')) AS m(slug, moment)
  JOIN audios a ON a.slug = m.slug
  WHERE spot_audios.spot_id = NEW.id AND spot_audios.audio_id = a.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spots_assign_default_audios ON public.spots;
CREATE TRIGGER spots_assign_default_audios AFTER INSERT ON public.spots
  FOR EACH ROW EXECUTE FUNCTION public.spot_assign_default_audios();

REVOKE EXECUTE ON FUNCTION public.spot_assign_default_audios() FROM PUBLIC, anon, authenticated;