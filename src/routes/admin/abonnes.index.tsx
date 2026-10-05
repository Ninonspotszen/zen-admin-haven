import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/abonnes/")({
  head: () => ({
    meta: [
      { title: "Abonnés & Ambassadeurs — Spots Zen Admin" },
      { name: "description", content: "Abonnés B2C et ambassadeurs Spots Zen." },
      { property: "og:title", content: "Abonnés & Ambassadeurs — Spots Zen Admin" },
      { property: "og:description", content: "Abonnés B2C et ambassadeurs Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbonnesPage,
});

type Abonne = {
  id: string;
  email: string;
  prenom: string | null;
  formule: string | null;
  statut: string | null;
  date_fin_acces: string | null;
  langue_preferee: string | null;
};

export const STATUTS = ["actif", "ambassadeur", "offert", "inactif"] as const;

export const STATUT_STYLE: Record<string, string> = {
  actif: "bg-primary/15 text-primary",
  ambassadeur: "bg-amber-100 text-amber-800 border border-amber-300",
  offert: "bg-accent text-accent-foreground",
  inactif: "bg-secondary text-muted-foreground",
};

export function StatutBadge({ statut }: { statut: string | null }) {
  const s = statut ?? "inactif";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUT_STYLE[s] ?? "bg-secondary text-muted-foreground"}`}>
      {s === "ambassadeur" && <Sparkles className="h-3 w-3" />}
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function AbonnesPage() {
  const navigate = useNavigate();
  const [statut, setStatut] = useState<string>("Tous");
  const [formule, setFormule] = useState<string>("Toutes");
  const [search, setSearch] = useState("");

  const { data: abonnes = [], isLoading, error } = useQuery({
    queryKey: ["abonnes"],
    queryFn: async (): Promise<Abonne[]> => {
      const { data, error } = await supabase
        .from("abonnes_b2c")
        .select("id, email, prenom, formule, statut, date_fin_acces, langue_preferee")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const formules = useMemo(
    () => [...new Set(abonnes.map((a) => a.formule).filter((f): f is string => !!f))].sort(),
    [abonnes],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { Tous: abonnes.length };
    for (const s of STATUTS) c[s] = abonnes.filter((a) => a.statut === s).length;
    return c;
  }, [abonnes]);

  const visible = abonnes.filter(
    (a) =>
      (statut === "Tous" || a.statut === statut) &&
      (formule === "Toutes" || a.formule === formule) &&
      a.email.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-xs font-semibold transition ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Abonnés & Ambassadeurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {abonnes.length} abonnés · {counts.actif} actifs · {counts.ambassadeur} ambassadeurs
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Statut :</span>
            {(["Tous", ...STATUTS] as const).map((s) => (
              <button key={s} onClick={() => setStatut(s)} className={pill(statut === s)}>
                {s === "Tous" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1 text-[11px] opacity-80">({counts[s]})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Formule :</span>
            {["Toutes", ...formules].map((f) => (
              <button key={f} onClick={() => setFormule(f)} className={pill(formule === f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un email..."
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Email</th>
              <th className="px-4 py-4">Formule</th>
              <th className="px-4 py-4">Statut</th>
              <th className="px-4 py-4">Fin d'accès</th>
              <th className="px-6 py-4">Langue</th>
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
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Aucun abonné</td></tr>
            )}
            {visible.map((a) => (
              <tr
                key={a.id}
                onClick={() => navigate({ to: "/admin/abonnes/$id", params: { id: a.id } })}
                className="cursor-pointer border-b last:border-0 transition hover:bg-secondary/40"
              >
                <td className="px-6 py-4">
                  <div className="font-semibold text-foreground">{a.email}</div>
                  {a.prenom && <div className="mt-0.5 text-xs text-muted-foreground">{a.prenom}</div>}
                </td>
                <td className="px-4 py-4 text-foreground">{a.formule ?? "—"}</td>
                <td className="px-4 py-4"><StatutBadge statut={a.statut} /></td>
                <td className="px-4 py-4 tabular-nums text-foreground">
                  {a.date_fin_acces ? new Date(a.date_fin_acces).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-6 py-4 uppercase text-muted-foreground">{a.langue_preferee ?? "fr"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
