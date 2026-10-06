import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Package,
  CalendarDays,
  Clock,
  Headphones,
  KeyRound,
  Link2,
  Save,
  Send,
  UserX,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { triggerActivationEmail } from "@/lib/clients.functions";

export const Route = createFileRoute("/admin/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client B2B — Spots Zen Admin" },
      { name: "description", content: "Détail d'un client B2B Spots Zen." },
      { property: "og:title", content: "Fiche client B2B — Spots Zen Admin" },
      { property: "og:description", content: "Détail d'un client B2B Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

type Client = {
  id: string;
  nom: string;
  type: string | null;
  pack_souscrit: string | null;
  statut: string | null;
  duree_acces_jours: number | null;
  date_pilote_fin: string | null;
  date_renouvellement: string | null;
  montant: number | null;
  note_interne: string | null;
  date_debut_acces: string | null;
};

const PACKS = ["Découverte", "Essentiel", "Premium"];
const STATUTS_CLIENT = ["En attente de paiement", "Pilote", "Actif annuel", "Suspendu"];
const fieldInput = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";

type Spot = {
  id: string;
  nom: string | null;
  statut: string | null;
  shortio_url: string | null;
  pin_code: string | null;
};

type AudioRow = {
  id: string;
  visible: boolean;
  audio_id: string | null;
  audios: {
    statut: string | null;
    titre_fr: string | null;
    audios_traductions: { titre: string }[];
  } | null;
};

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      const [{ data: client, error: e1 }, { data: spots, error: e2 }, { data: clientAudios, error: e3 }] =
        await Promise.all([
          supabase.from("clients").select("*").eq("id", id).maybeSingle(),
          supabase
            .from("spots")
            .select("id, nom, statut, shortio_url, pin_code")
            .eq("client_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("client_audios")
            .select(
              "id, visible, audio_id, audios(statut, titre_fr, audios_traductions(titre))",
            )
            .eq("client_id", id),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      // Statistiques d'écoute : écoutes des spots de ce client
      const spotIds = (spots ?? []).map((s) => s.id);
      let total = 0;
      let moyenneMin: number | null = null;
      if (spotIds.length) {
        const { data: ecoutes, error: e4 } = await supabase
          .from("ecoutes")
          .select("duree_ecoute_sec")
          .in("spot_id", spotIds);
        if (e4) throw e4;
        const valeurs = (ecoutes ?? [])
          .map((e) => e.duree_ecoute_sec)
          .filter((v): v is number => v != null);
        total = (ecoutes ?? []).length;
        moyenneMin = valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length / 60 : null;
      }
      return {
        client: (client ?? null) as Client | null,
        spots: (spots ?? []) as Spot[],
        audios: (clientAudios ?? []) as AudioRow[],
        ecoutes: { total, moyenneMin },
      };
    },
  });

  const client = data?.client ?? null;

  const [duree, setDuree] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [pack, setPack] = useState("");
  const [statut, setStatut] = useState("");
  const [debut, setDebut] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (client) {
      setDuree(client.duree_acces_jours != null ? String(client.duree_acces_jours) : "");
      setNote(client.note_interne ?? "");
      setNom(client.nom);
      setType(client.type ?? "");
      setPack(client.pack_souscrit ?? "");
      setStatut(client.statut ?? "");
      setDebut(client.date_debut_acces ?? "");
      setDirty(false);
    }
  }, [client]);
  const edit = (setter: (v: string) => void) => (v: string) => { setter(v); setDirty(true); };

  const save = useMutation({
    mutationFn: async () => {
      let dureeValue: number | null;
      if (!nom.trim()) throw new Error("Le nom du client est obligatoire");
      if (duree.trim() === "") {
        dureeValue = null;
      } else {
        const n = Number(duree);
        if (!Number.isFinite(n) || n < 0) throw new Error("Durée d'accès invalide");
        dureeValue = Math.round(n);
      }
      const { error } = await supabase
        .from("clients")
        .update({
          duree_acces_jours: dureeValue,
          note_interne: note || null,
          nom: nom.trim(),
          type: type.trim() || null,
          pack_souscrit: pack || null,
          statut: statut || null,
          date_debut_acces: debut || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modifications enregistrées");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["client-detail", id] });
      qc.invalidateQueries({ queryKey: ["clients-b2b"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVisible = useMutation({
    mutationFn: async (row: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("client_audios")
        .update({ visible: !row.visible })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({ statut: "Suspendu" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte passé en Suspendu");
      qc.invalidateQueries({ queryKey: ["client-detail", id] });
      qc.invalidateQueries({ queryKey: ["clients-b2b"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateEmail = useMutation({
    mutationFn: (clientId: string) => triggerActivationEmail({ data: clientId }),
    onSuccess: () => {
      toast.success("Email d'accès envoyé au client");
      qc.invalidateQueries({ queryKey: ["client-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-10 text-center text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-10 text-center text-destructive">
        {(error as Error)?.message || "Client introuvable"}
      </div>
    );
  }

  return (
    <div>
      {/* Fil d'ariane */}
      <Link to="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux clients
      </Link>

      {/* En-tête */}
      <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-accent font-serif text-lg font-semibold text-accent-foreground">
            {client.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">{client.nom}</h1>
              <StatutBadge statut={client.statut} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[client.pack_souscrit, client.type].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={activateEmail.isPending}
            onClick={() => activateEmail.mutate(client.id)}
            className="flex w-fit items-center gap-2 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Send className="h-4 w-4 text-muted-foreground" />
            {activateEmail.isPending ? "Envoi en cours…" : "Activer le compte"}
          </button>
          {client.statut !== "Suspendu" && (
            <button
              disabled={suspend.isPending}
              onClick={() => {
                if (confirm(`Suspendre le compte de ${client.nom} ?`)) suspend.mutate();
              }}
              className="flex w-fit items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              <UserX className="h-4 w-4" /> {suspend.isPending ? "Suspension…" : "Passer en Suspendu"}
            </button>
          )}
          <button
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate()}
            className="flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement…" : "Sauvegarder les modifications"}
          </button>
        </div>
      </div>

      {/* Section Informations (édition en ligne) */}
      <Section title="Informations" subtitle="Modifie puis clique sur « Sauvegarder les modifications »">
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Nom du client" icon={Building2}>
            <input value={nom} onChange={(e) => edit(setNom)(e.target.value)} maxLength={200} className={fieldInput} />
          </Field>
          <Field label="Type d'établissement" icon={Building2}>
            <input value={type} onChange={(e) => edit(setType)(e.target.value)} maxLength={100} placeholder="Hôtel, spa, entreprise…" className={fieldInput} />
          </Field>
          <Field label="Pack souscrit" icon={Package}>
            <select value={pack} onChange={(e) => edit(setPack)(e.target.value)} className={fieldInput}>
              <option value="">—</option>
              {PACKS.map((p) => <option key={p} value={p}>{p}</option>)}
              {pack && !PACKS.includes(pack) && <option value={pack}>{pack}</option>}
            </select>
          </Field>
          <Field label="Statut" icon={Package}>
            <select value={statut} onChange={(e) => edit(setStatut)(e.target.value)} className={fieldInput}>
              <option value="">—</option>
              {STATUTS_CLIENT.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Section Spots */}
      <Section
        title="Spots"
        subtitle={`${data!.spots.length} spot${data!.spots.length > 1 ? "s" : ""} lié${data!.spots.length > 1 ? "s" : ""} à ce client`}
      >
        {data!.spots.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun spot pour ce client</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3.5">Nom</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5">Lien court</th>
                <th className="px-6 py-3.5">Code PIN</th>
              </tr>
            </thead>
            <tbody>
              {data!.spots.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-semibold text-foreground">{s.nom ?? "—"}</td>
                  <td className="px-4 py-4">
                    <SpotBadge statut={s.statut} />
                  </td>
                  <td className="px-4 py-4">
                    {s.shortio_url ? (
                      <a
                        href={s.shortio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Link2 className="h-3.5 w-3.5" /> {s.shortio_url}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {s.pin_code ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs font-semibold text-secondary-foreground">
                        <KeyRound className="h-3 w-3" /> {s.pin_code}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Section Stats d'écoute */}
      <Section
        title="Statistiques d'écoute"
        subtitle={`Écoutes cumulées sur les ${data!.spots.length} spot${data!.spots.length > 1 ? "s" : ""} de ce client`}
      >
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Écoutes cumulées" icon={Headphones}>
            <div className="rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm font-semibold text-foreground">
              {data!.ecoutes.total.toLocaleString("fr-FR")}
            </div>
          </Field>
          <Field label="Durée moyenne d'écoute" icon={Clock}>
            <div className="rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm font-semibold text-foreground">
              {data!.ecoutes.moyenneMin != null
                ? `${Math.floor(data!.ecoutes.moyenneMin)} min ${String(Math.round((data!.ecoutes.moyenneMin % 1) * 60)).padStart(2, "0")} s`
                : "—"}
            </div>
          </Field>
        </div>
      </Section>

      {/* Section Audios assignés */}
      <Section
        title="Audios assignés"
        subtitle="Visible dans la PWA : audio publié + visible activé"
      >
        {data!.audios.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun audio assigné à ce client</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3.5">Titre</th>
                <th className="px-4 py-3.5">Statut audio</th>
                <th className="px-6 py-3.5 text-right">Visible</th>
              </tr>
            </thead>
            <tbody>
              {data!.audios.map((a) => {
                const titre =
                  a.audios?.audios_traductions?.find((t) => t.titre)?.titre ??
                  a.audios?.titre_fr ??
                  "—";
                const brouillon = a.audios?.statut === "brouillon";
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-6 py-4 font-semibold text-foreground">{titre}</td>
                    <td className="px-4 py-4">
                      <AudioBadge statut={a.audios?.statut ?? null} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {brouillon ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Audio en brouillon : invisible pour tous les clients, sans exception"
                        >
                          Brouillon — invisible pour tous
                        </span>
                      ) : (
                        <Toggle
                          checked={a.visible}
                          disabled={toggleVisible.isPending}
                          onChange={() => toggleVisible.mutate({ id: a.id, visible: a.visible })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Section Accès */}
      <Section title="Accès" subtitle="Durée et échéances du contrat">
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Durée d'accès (jours)" icon={Clock}>
            <input
              type="number"
              min={0}
              value={duree}
              onChange={(e) => {
                setDuree(e.target.value);
                setDirty(true);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>
          <Field label="Début d'accès" icon={CalendarDays}>
            <input type="date" value={debut} onChange={(e) => edit(setDebut)(e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Montant (€/an)" icon={Wallet}>
            <div className="rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm font-semibold text-foreground">
              {client.montant != null ? `${client.montant.toLocaleString("fr-FR")} €/an` : "—"}
            </div>
          </Field>
          <Field label="Fin du pilote" icon={CalendarDays}>
            <div className="rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground">
              {client.date_pilote_fin
                ? new Date(client.date_pilote_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </div>
          </Field>
          <Field label="Renouvellement" icon={CalendarDays}>
            <div className="rounded-xl border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground">
              {client.date_renouvellement
                ? new Date(client.date_renouvellement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </div>
          </Field>
        </div>
      </Section>

      {/* Section Notes */}
      <Section title="Notes" subtitle="Note interne — jamais visible par le client">
        <div className="p-6">
          <textarea
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
            placeholder="Ajouter une note interne…"
            className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </Section>

      {/* Pied de page : sauvegarde */}
      <div className="mt-6 flex justify-end">
        <button
          disabled={save.isPending || !dirty}
          onClick={() => save.mutate()}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement…" : "Sauvegarder les modifications"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}

function StatutBadge({ statut }: { statut: string | null }) {
  const styles: Record<string, string> = {
    Pilote: "bg-warning text-warning-foreground",
    "Actif annuel": "bg-accent text-accent-foreground",
    "En attente de paiement": "bg-secondary text-secondary-foreground",
    Suspendu: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[statut ?? ""] ?? "bg-secondary text-muted-foreground"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statut ?? "—"}
    </span>
  );
}

function SpotBadge({ statut }: { statut: string | null }) {
  const styles: Record<string, string> = {
    actif: "bg-accent text-accent-foreground",
    inactif: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[statut ?? ""] ?? "bg-secondary text-muted-foreground"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statut ?? "—"}
    </span>
  );
}

function AudioBadge({ statut }: { statut: string | null }) {
  const styles: Record<string, string> = {
    publié: "bg-accent text-accent-foreground",
    brouillon: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[statut ?? ""] ?? "bg-secondary text-muted-foreground"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statut ?? "—"}
    </span>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-card shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
