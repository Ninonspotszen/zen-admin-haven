-- Protection contre les abus (16/10/2026) — à exécuter une fois dans le SQL Editor. Idempotent.
-- 1. Code PIN des spots : au-delà de 20 codes faux en 10 minutes sur un même spot, on bloque 10 minutes
--    (sans cela, un robot pouvait essayer les 10 000 combinaisons à 4 chiffres).
-- 2. Formulaires publics : table de comptage utilisée par le serveur (limite par adresse IP, stockée hachée).

CREATE TABLE IF NOT EXISTS public.limites_tentatives (
  id bigserial PRIMARY KEY,
  cle text NOT NULL,            -- ex. « pin:<spot> », « contact:<ip hachée> »
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS limites_tentatives_cle_idx ON public.limites_tentatives (cle, created_at DESC);
ALTER TABLE public.limites_tentatives ENABLE ROW LEVEL SECURITY;
-- Aucune politique : ni le public ni l'admin ne lisent cette table ; seuls le serveur et la fonction ci-dessous y écrivent.

-- La fonction actuelle (telle qu'elle est en production) est conservée sous un autre nom,
-- puis enveloppée par une nouvelle get_spot_catalog qui compte les codes faux.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_spot_catalog_interne' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_spot_catalog(uuid, text) RENAME TO get_spot_catalog_interne;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.get_spot_catalog_interne(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_spot_catalog(p_id uuid, p_pin text)
 RETURNS json LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_cle text := 'pin:' || p_id::text;
  v_resultat json;
BEGIN
  IF p_pin IS NOT NULL AND (
    SELECT count(*) FROM public.limites_tentatives WHERE cle = v_cle AND created_at > now() - interval '10 minutes'
  ) >= 20 THEN
    RAISE EXCEPTION 'trop_de_tentatives';
  END IF;

  v_resultat := public.get_spot_catalog_interne(p_id, p_pin);

  -- Code saisi mais refusé, sur un spot protégé par PIN : on compte l'échec.
  IF v_resultat IS NULL AND p_pin IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.spots WHERE id = p_id AND pin_code IS NOT NULL) THEN
    INSERT INTO public.limites_tentatives (cle) VALUES (v_cle);
  END IF;
  RETURN v_resultat;
END;
$$;
REVOKE ALL ON FUNCTION public.get_spot_catalog(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_catalog(uuid, text) TO anon, authenticated;
