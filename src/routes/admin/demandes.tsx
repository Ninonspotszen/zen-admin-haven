import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/demandes")({
  head: () => ({
    meta: [
      { title: "Demandes de contact — Spots Zen Admin" },
      { name: "description", content: "Demandes reçues depuis le formulaire professionnels." },
    ],
  }),
  component: DemandesPage,
});

const STATUTS = [
  { v: "nouvelle", label: "Nouvelle", cls: "bg-amber-100 text-amber-800" },
  { v: "en_cours", label: "En cours", cls: "bg-blue-100 text-blue-800" },
  { v: "traitee", label: "Traitée", cls: "bg-green-100 text-green-800" },
] as const;
const SECTEUR: Record<string, string> = {
  hebergements: "Hébergement touristique",
  entreprises: "Entreprise",
  ecoles: "École / campus",
  sante: "Santé",
  collectivites: "Collectivité",
  general: "Général",
};
const NOTIF: Record<string, string> = {
  sent: "alerte email envoyée",
  disabled: "alerte email désactivée",
  failed: "alerte email en échec",
};

function DemandesPage() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<"a_traiter" | "toutes">("a_traiter");

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("id, created_at, secteur, nom, email, etablissement, type_structure, taille, message, statut, notification")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Une nouvelle demande apparaît sans recharger la page.
  useEffect(() => {
    const ch = supabase
      .channel("admin-demandes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, () =>
        qc.invalidateQueries({ queryKey: ["contact_requests"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const changer = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("contact_requests").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact_requests"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(`Statut non enregistré : ${e.message}`),
  });

  const lignes = (data ?? []).filter((d) => filtre === "toutes" || d.statut !== "traitee");
  const aTraiter = (data ?? []).filter((d) => d.statut !== "traitee").length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl text-foreground">Demandes de contact</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reçues depuis le formulaire de la page Professionnels. Chaque nouvelle demande vous est aussi envoyée par email.
      </p>

      <div className="mt-6 flex gap-2" role="group" aria-label="Filtrer les demandes">
        {(
          [
            ["a_traiter", `À traiter (${aTraiter})`],
            ["toutes", `Toutes (${data?.length ?? 0})`],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFiltre(v)}
            aria-pressed={filtre === v}
            className={`rounded-full border px-4 py-1.5 text-sm ${filtre === v ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          Les demandes n'ont pas pu être chargées ({(error as Error).message}).
        </p>
      ) : isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {filtre === "a_traiter" ? "Aucune demande à traiter." : "Aucune demande reçue pour l'instant."}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {lignes.map((d) => {
            const st = STATUTS.find((s) => s.v === d.statut) ?? STATUTS[0];
            return (
              <li key={d.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })} ·{" "}
                      {SECTEUR[d.secteur] ?? d.secteur}
                      {d.notification ? ` · ${NOTIF[d.notification] ?? d.notification}` : ""}
                    </p>
                    <p className="mt-1 font-serif text-lg text-foreground">{d.etablissement || d.nom || "Sans nom"}</p>
                    <p className="text-sm text-muted-foreground">
                      {[d.nom, d.type_structure, d.taille].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    <label className="sr-only" htmlFor={`statut-${d.id}`}>Statut de la demande</label>
                    <select
                      id={`statut-${d.id}`}
                      value={d.statut}
                      onChange={(e) => changer.mutate({ id: d.id, statut: e.target.value })}
                      className="rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {STATUTS.map((s) => (
                        <option key={s.v} value={s.v}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {d.message && <p className="mt-3 whitespace-pre-wrap border-l-2 border-primary/40 pl-3 text-sm text-foreground">{d.message}</p>}
                {d.email && (
                  <a
                    href={`mailto:${d.email}?subject=${encodeURIComponent("Votre demande Spots Zen")}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden /> {d.email}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
