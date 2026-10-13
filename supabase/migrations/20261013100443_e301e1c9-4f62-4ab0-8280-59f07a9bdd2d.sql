ALTER TABLE public.clients DROP CONSTRAINT clients_statut_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_statut_check
  CHECK (statut IN ('En attente de paiement', 'Pilote', 'Actif annuel', 'Suspendu'));