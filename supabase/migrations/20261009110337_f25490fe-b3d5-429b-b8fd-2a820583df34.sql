CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  secteur text NOT NULL CHECK (secteur IN ('hebergements','entreprises','ecoles','sante','collectivites','general')),
  nom text CHECK (char_length(nom) <= 200),
  email text CHECK (char_length(email) <= 255),
  etablissement text CHECK (char_length(etablissement) <= 200),
  type_structure text CHECK (char_length(type_structure) <= 200),
  taille text CHECK (char_length(taille) <= 100),
  message text CHECK (char_length(message) <= 5000)
);
GRANT INSERT ON public.contact_requests TO anon, authenticated;
GRANT SELECT, DELETE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read contact requests" ON public.contact_requests FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete contact requests" ON public.contact_requests FOR DELETE TO authenticated USING (public.is_admin());