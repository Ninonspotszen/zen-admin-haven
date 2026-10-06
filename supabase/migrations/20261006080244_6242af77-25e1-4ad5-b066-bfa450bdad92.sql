ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS adresse text;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS note_interne text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS date_debut_acces date;