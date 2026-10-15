-- Journal de la feature IA (Spots Zen, 15/10/2026) — à exécuter une fois dans le SQL Editor de Supabase.
-- Brique 5 « Bases de données : le journal » et règle n°4 « une ligne de journal par passage ».
-- Chaque clic sur « Traduire avec l'IA » écrit une ligne : réussi, échoué ou désactivé.
-- Idempotent : peut être relancé sans effet de bord.

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  agent         text NOT NULL,                        -- ex. 'traduction_audio'
  audio_id      uuid REFERENCES public.audios(id) ON DELETE SET NULL,
  declenche_par uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- l'admin qui a cliqué
  modele        text,
  statut        text NOT NULL CHECK (statut IN ('reussi', 'echec', 'desactive')),
  duree_ms      integer,
  tokens_entree integer,
  tokens_sortie integer,
  cout_usd      numeric(10, 6),
  erreur        text
);

CREATE INDEX IF NOT EXISTS agent_logs_audio_idx ON public.agent_logs (audio_id, created_at DESC);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture réservées aux admins. Aucune règle UPDATE ni DELETE :
-- une fois écrite, une ligne de journal ne peut plus être modifiée depuis l'app.
DROP POLICY IF EXISTS "agent_logs_admin_select" ON public.agent_logs;
CREATE POLICY "agent_logs_admin_select" ON public.agent_logs
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "agent_logs_admin_insert" ON public.agent_logs;
CREATE POLICY "agent_logs_admin_insert" ON public.agent_logs
FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND declenche_par = auth.uid());
