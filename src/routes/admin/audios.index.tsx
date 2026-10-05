import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/audios/")({
  head: () => ({
    meta: [
      { title: "Bibliothèque audio — Spots Zen Admin" },
      { name: "description", content: "Catalogue global des audios Spots Zen." },
      { property: "og:title", content: "Bibliothèque audio — Spots Zen Admin" },
      { property: "og:description", content: "Catalogue global des audios Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AudiosPage,
});

export type AudioListRow = {
  id: string;
  reference_interne: string | null;
  statut: string | null;
  duree_secondes: number | null;
  type: string | null;
  moment: string | null;
  titre: string;
  voix: string[];
};

export const VOIX_LABEL: Record<string, string> = { F: "Voix féminine", M: "Voix masculine" };

export const fmtDuree = (s: number | null) =>
  s == null ? "—" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

async function fetchAudios(): Promise<AudioListRow[]> {
  const { data, error } = await supabase
    .from("audios")
    .select("id, reference_interne, statut, duree_secondes, type, moment, titre_fr, audios_traductions(titre, voix, langue)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => {
    const fr = ((a.audios_traductions as { titre: string; voix: string | null; langue: string }[]) ?? []).filter(
      (t) => t.langue === "fr",
    );
    return {
      id: a.id,
      reference_interne: a.reference_interne,
      statut: a.statut,
      duree_secondes: a.duree_secondes,
      type: a.type,
      moment: a.moment,
      titre: fr[0]?.titre ?? a.titre_fr ?? "Sans titre",
      voix: [...new Set(fr.map((t) => t.voix).filter((v): v is string => v === "F" || v === "M"))],
    };
  });
}

type StatutFilter = "Tous" | "publié" | "brouillon";
type VoixFilter = "Toutes" | "F" | "M";

function AudiosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statut, setStatut] = useState<StatutFilter>("Tous");
  const [voix, setVoix] = useState<VoixFilter>("Toutes");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: audios = [], isLoading, error } = useQuery({ queryKey: ["audios"], queryFn: fetchAudios });

  const toggle = useMutation({
    mutationFn: async (a: AudioListRow) => {
      const next = a.statut === "publié" ? "brouillon" : "publié";
      const { error } = await supabase.from("audios").update({ statut: next }).eq("id", a.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next, a) => {
      toast.success(`« ${a.titre} » ${next === "publié" ? "publié" : "passé en brouillon"}`);
      qc.invalidateQueries({ queryKey: ["audios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(
    () => ({
      Tous: audios.length,
      publié: audios.filter((a) => a.statut === "publié").length,
      brouillon: audios.filter((a) => a.statut === "brouillon").length,
    }),
    [audios],
  );

  const visible = audios.filter(
    (a) =>
      (statut === "Tous" || a.statut === statut) &&
      (voix === "Toutes" || a.voix.includes(voix)) &&
      a.titre.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-xs font-semibold transition ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Bibliothèque audio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {audios.length} titres au catalogue · {counts.publié} publiés · {counts.brouillon} brouillons
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nouvel audio
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Statut :</span>
            {(["Tous", "publié", "brouillon"] as const).map((s) => (
              <button key={s} onClick={() => setStatut(s)} className={pill(statut === s)}>
                {s === "Tous" ? "Tous" : s === "publié" ? "Publié" : "Brouillon"}
                <span className="ml-1 text-[11px] opacity-80">({counts[s]})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Voix :</span>
            {(["Toutes", "F", "M"] as const).map((v) => (
              <button key={v} onClick={() => setVoix(v)} className={pill(voix === v)}>
                {v === "Toutes" ? "Toutes" : v === "F" ? "Féminine" : "Masculine"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un audio..."
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Audio / Titre</th>
              <th className="px-4 py-4">Voix</th>
              <th className="px-4 py-4">Durée</th>
              <th className="px-4 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Publication</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Chargement…</td></tr>
            )}
            {error && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-destructive">Erreur : {(error as Error).message}</td></tr>
            )}
            {!isLoading && !error && visible.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Aucun audio</td></tr>
            )}
            {visible.map((a) => {
              const pub = a.statut === "publié";
              return (
                <tr
                  key={a.id}
                  onClick={() => navigate({ to: "/admin/audios/$id", params: { id: a.id } })}
                  className="cursor-pointer border-b last:border-0 transition hover:bg-secondary/40"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{a.titre}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.reference_interne ? `#${a.reference_interne}` : ""}
                      {a.type ? ` · ${a.type}` : ""}
                      {a.moment ? ` · ${a.moment}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {a.voix.map((v) => (
                        <span key={v} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                          {VOIX_LABEL[v]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 tabular-nums text-foreground">{fmtDuree(a.duree_secondes)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        pub ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {pub ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      role="switch"
                      aria-checked={pub}
                      aria-label={pub ? "Passer en brouillon" : "Publier"}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(a)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        pub ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${
                          pub ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && <NewAudioDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewAudioDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [titre, setTitre] = useState("");
  const [voix, setVoix] = useState("aucune");
  const [type, setType] = useState("");
  const [moment, setMoment] = useState("");
  const [minutes, setMinutes] = useState("");
  const [secondes, setSecondes] = useState("");
  const [statut, setStatut] = useState("brouillon");

  const create = useMutation({
    mutationFn: async () => {
      const duree = minutes || secondes ? Number(minutes || 0) * 60 + Number(secondes || 0) : null;
      const { data, error } = await supabase
        .from("audios")
        .insert({ titre_fr: titre, type: type || null, moment: moment || null, duree_secondes: duree, statut })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("audios_traductions")
        .insert({ audio_id: data.id, langue: "fr", titre, voix });
      if (e2) throw e2;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Audio créé");
      qc.invalidateQueries({ queryKey: ["audios"] });
      navigate({ to: "/admin/audios/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
  const label = "mb-1 block text-xs font-semibold text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!titre.trim()) toast.error("Le titre est obligatoire");
          else create.mutate();
        }}
        className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-foreground">Nouvel audio</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Titre (français)</label>
            <input className={input} value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={label}>Type</label>
            <input className={input} value={type} onChange={(e) => setType(e.target.value)} placeholder="Méditation…" />
          </div>
          <div>
            <label className={label}>Moment</label>
            <input className={input} value={moment} onChange={(e) => setMoment(e.target.value)} placeholder="Matin, Soir…" />
          </div>
          <div>
            <label className={label}>Voix</label>
            <select className={input} value={voix} onChange={(e) => setVoix(e.target.value)}>
              <option value="F">Voix féminine</option>
              <option value="M">Voix masculine</option>
              <option value="aucune">Aucune voix</option>
            </select>
          </div>
          <div>
            <label className={label}>Durée (mm:ss)</label>
            <div className="flex items-center gap-2">
              <input className={input} type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="mm" />
              <span>:</span>
              <input className={input} type="number" min={0} max={59} value={secondes} onChange={(e) => setSecondes(e.target.value)} placeholder="ss" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Statut</label>
            <select className={input} value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="brouillon">Brouillon</option>
              <option value="publié">Publié</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-input px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
            Annuler
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {create.isPending ? "Création…" : "Créer l'audio"}
          </button>
        </div>
      </form>
    </div>
  );
}
