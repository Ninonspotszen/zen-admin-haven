DROP POLICY IF EXISTS "anon_read_traductions" ON public.audios_traductions;
DROP POLICY IF EXISTS "auth_read_traductions" ON public.audios_traductions;
CREATE POLICY "read_traductions_published" ON public.audios_traductions FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.audios a WHERE a.id = audio_id AND a.statut = 'publié'));

DROP POLICY IF EXISTS "anon_read_spot_audios" ON public.spot_audios;
DROP POLICY IF EXISTS "auth_read_spot_audios" ON public.spot_audios;

DROP POLICY IF EXISTS "anon_read_audio_filtres" ON public.audio_filtres;
DROP POLICY IF EXISTS "auth_read_audio_filtres" ON public.audio_filtres;
CREATE POLICY "read_audio_filtres_published" ON public.audio_filtres FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.audios a WHERE a.id = audio_id AND a.statut = 'publié'));