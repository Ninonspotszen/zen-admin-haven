import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/spots/")({
  head: () => ({
    meta: [
      { title: "Spots · Spots Zen Admin" },
      { name: "description", content: "Configuration des spots Spots Zen." },
      { property: "og:title", content: "Spots · Spots Zen Admin" },
      { property: "og:description", content: "Configuration des spots Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotsList,
});

type Row = {
  id: string;
  nom: string | null;
  statut: string | null;
  pin_code: string | null;
  shortio_url: string | null;
  client: { nom: string } | null;
};

function SpotsList() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("tous");
  const [createOpen, setCreateOpen] = useState(false);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["spots-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("id, nom, statut, pin_code, shortio_url, client:client_id(nom)")
        .order("nom");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const statuts = useMemo(
    () => Array.from(new Set(data.map((s) => s.statut).filter(Boolean))) as string[],
    [data],
  );
  const rows = data.filter(
    (s) =>
      (statut === "tous" || s.statut === statut) &&
      `${s.nom ?? ""} ${s.client?.nom ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Configuration des spots</h1>
          <p className="text-muted-foreground text-sm">{data.length} spots</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nouveau spot
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un spot ou client"
            className="pl-9 pr-4 py-2 rounded-full border bg-card text-sm w-72"
          />
        </div>
        {["tous", ...statuts].map((s) => (
          <button
            key={s}
            onClick={() => setStatut(s)}
            className={`px-4 py-1.5 rounded-full text-sm border ${statut === s ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {s === "tous" ? "Tous" : s}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="p-4">Spot</th>
              <th className="p-4">Client</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Code PIN</th>
              <th className="p-4">Lien court</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {error && <tr><td colSpan={5} className="p-6 text-center text-destructive">Erreur de chargement</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun spot</td></tr>}
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => navigate({ to: "/admin/spots/$id", params: { id: s.id } })}
                className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
              >
                <td className="p-4 font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{s.nom ?? "—"}</td>
                <td className="p-4">{s.client?.nom ?? "—"}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${s.statut === "actif" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{s.statut ?? "—"}</span>
                </td>
                <td className="p-4 font-mono">{s.pin_code ?? "—"}</td>
                <td className="p-4 truncate max-w-[220px]">
                  {s.shortio_url ? (
                    <a href={s.shortio_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline">{s.shortio_url}</a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
