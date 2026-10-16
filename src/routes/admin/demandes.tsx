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

// Pipeline commercial B2B, dans l'ordre du parcours. « traitee » reste pour les demandes sans suite commerciale.
const STATUTS = [
  { v: "nouvelle", label: "Nouvelle", cls: "bg-amber-100 text-amber-800" },
  { v: "en_cours", label: "Contactée", cls: "bg-blue-100 text-blue-800" },
  { v: "demo", label: "Démo / rendez-vous", cls: "bg-indigo-100 text-indigo-800" },
  { v: "devis", label: "Devis envoyé", cls: "bg-purple-100 text-purple-800" },
  { v: "pilote", label: "Pilote en cours", cls: "bg-teal-100 text-teal-800" },
  { v: "client", label: "Client signé", cls: "bg-green-100 text-green-800" },
  { v: "perdue", label: "Perdue", cls: "bg-zinc-200 text-zinc-700" },
  { v: "traitee", label: "Classée (sans suite)", cls: "bg-zinc-100 text-zinc-600" },
] as const;
const FERMEES = ["client", "perdue", "traitee"];
const aujourdhui = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

type Demande = {
  id: string; created_at: string; secteur: string; nom: string | null; email: string | null; etablissement: string | null;
  type_structure: string | null; taille: string | null; message: string | null; statut: string; notification: string | null;
  accuse_reception: string | null; note: string | null; prochaine_action: string | null; refus_actualites: boolean | null;
};
const SECTEUR: Record<string, string> = {
  hebergements: "Hébergement touristique",
  entreprises: "Entreprise",
  ecoles: "École / campus",
  sante: "Santé",
  collectivites: "Collectivité",
  general: "Général",
};
const ACCUSE: Record<string, string> = { sent: "envoyé", disabled: "désactivé", failed: "en échec" };
const NOTIF: Record<string, string> = {
  sent: "alerte email envoyée",
  disabled: "alerte email désactivée",
  failed: "alerte email en échec",
};

function DemandesPage() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<"a_traiter" | "ouvertes" | "toutes">("ouvertes");

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("id, created_at, secteur, nom, email, etablissement, type_structure, taille, message, statut, notification, accuse_reception, note, prochaine_action, refus_actualites" as "id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Demande[];
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
    mutationFn: async ({ id, ...champs }: { id: string; statut?: string; note?: string | null; prochaine_action?: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("contact_requests").update(champs as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact_requests"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(`Modification non enregistrée : ${e.message}`),
  });

  const jour = aujourdhui();
  const estATraiter = (d: Demande) => !FERMEES.includes(d.statut) && (d.statut === "nouvelle" || (!!d.prochaine_action && d.prochaine_action <= jour));
  const tout = data ?? [];
  const lignes = tout.filter((d) => filtre === "toutes" || (filtre === "ouvertes" ? !FERMEES.includes(d.statut) : estATraiter(d)));
  const aTraiter = tout.filter(estATraiter).length;
  const ouvertes = tout.filter((d) => !FERMEES.includes(d.statut)).length;
  const parEtape = STATUTS.map((s) => ({ ...s, n: tout.filter((d) => d.statut === s.v).length }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl text-foreground">Demandes de contact</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reçues depuis le formulaire de la page Professionnels, puis suivies étape par étape jusqu'à la signature.
      </p>

      {/* Entonnoir : combien de prospects à chaque étape */}
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Pipeline commercial">
        {parEtape.map((s) => (
          <li key={s.v} className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.label} · {s.n}</li>
        ))}
      </ol>

      <div className="mt-6 flex gap-2" role="group" aria-label="Filtrer les demandes">
        {(
          [
            ["a_traiter", `À traiter (${aTraiter})`],
            ["ouvertes", `En cours (${ouvertes})`],
            ["toutes", `Toutes (${tout.length})`],
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
          {filtre === "toutes" ? "Aucune demande reçue pour l'instant." : "Aucune demande dans cette vue."}
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
                      {d.accuse_reception ? ` · accusé de réception : ${ACCUSE[d.accuse_reception] ?? d.accuse_reception}` : ""}
                      {d.refus_actualites ? " · ne veut pas recevoir les actualités" : ""}
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
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="block text-xs text-muted-foreground">
                    Note de suivi
                    <textarea
                      defaultValue={d.note ?? ""}
                      rows={2}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (d.note ?? null)) changer.mutate({ id: d.id, note: v });
                      }}
                      placeholder="Ex. : appel le 20/10, intéressée par 3 spots, rappeler après validation du budget"
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Prochaine action
                    <input
                      type="date"
                      defaultValue={d.prochaine_action ?? ""}
                      onChange={(e) => changer.mutate({ id: d.id, prochaine_action: e.target.value || null })}
                      className={`mt-1 block rounded-xl border bg-background px-3 py-2 text-sm text-foreground ${d.prochaine_action && d.prochaine_action <= jour && !FERMEES.includes(d.statut) ? "border-amber-500" : "border-input"}`}
                    />
                  </label>
                </div>
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
