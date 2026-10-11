CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_abonne_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.abonnes_b2c SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests
FOR INSERT TO anon, authenticated
WITH CHECK (secteur IS NOT NULL AND length(secteur) BETWEEN 1 AND 100);

DROP POLICY IF EXISTS "anon_insert_ecoutes" ON public.ecoutes;
CREATE POLICY "anon_insert_ecoutes" ON public.ecoutes
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.audios a WHERE a.id = audio_id AND a.statut = 'publié')
  AND (user_id IS NULL OR user_id = auth.uid())
);