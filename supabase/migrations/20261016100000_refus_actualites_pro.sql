-- Formulaire Professionnels : case « je ne souhaite pas recevoir les actualités » (16/10/2026).
-- Prospection B2B : information + droit d'opposition simple. Idempotent.
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS refus_actualites boolean NOT NULL DEFAULT false;
