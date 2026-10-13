ALTER TABLE public.clients DROP CONSTRAINT clients_statut_check;
UPDATE public.clients SET statut = 'Actif' WHERE statut = 'Actif annuel';
ALTER TABLE public.clients ADD CONSTRAINT clients_statut_check
  CHECK (statut IN ('En attente de paiement', 'Pilote', 'Actif', 'Suspendu'));

ALTER TABLE public.clients DROP CONSTRAINT clients_statut_paiement_check;
UPDATE public.clients SET statut_paiement = 'Virement reçu' WHERE statut_paiement = 'Reçu';
ALTER TABLE public.clients ADD CONSTRAINT clients_statut_paiement_check
  CHECK (statut_paiement IN ('En attente', 'Virement reçu', 'En retard'));

CREATE OR REPLACE FUNCTION public.spot_email_ok(p_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_id AND s.statut = 'actif'
      AND c.mode_acces = 'email_domaine'
      AND c.statut IN ('Pilote', 'Actif')
      AND auth.uid() IS NOT NULL
      AND lower(substring(coalesce(auth.email(), '') from '@([^@]+)$')) = c.domaine_email
  )
$function$;

CREATE OR REPLACE FUNCTION public.check_spot_email_domain(p_id uuid, p_email text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_id AND s.statut = 'actif'
      AND c.mode_acces = 'email_domaine'
      AND c.statut IN ('Pilote', 'Actif')
      AND trim(p_email) ~ '^[^@\s]+@[^@\s]+$'
      AND lower(substring(trim(p_email) from '@([^@]+)$')) = c.domaine_email
  )
$function$;