import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Hourglass,
  Mail,
  Play,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/clients/")({
  head: () => ({
    meta: [
      { title: "Clients B2B — Spots Zen Admin" },
      { name: "description", content: "Liste et suivi des clients B2B Spots Zen." },
      { property: "og:title", content: "Clients B2B — Spots Zen Admin" },
      { property: "og:description", content: "Liste et suivi des clients B2B Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

const STATUTS = ["En attente de paiement", "Pilote", "Actif annuel", "Suspendu"] as const;
type Filter = "Tous" | (typeof STATUTS)[number];
const FILTERS: { key: Filter; label: string }[] = [
  { key: "Tous", label: "Tous" },
  { key: "Pilote", label: "Pilote" },
  { key: "Actif annuel", label: "Actif annuel" },
  { key: "En attente de paiement", label: "En attente" },
  { key: "Suspendu", label: "Suspendu" },
];

type ClientRow = {
  id: string;
  nom: string;
  type: string | null;
  pack_souscrit: string | null;
  statut: string | null;
  statut_paiement: string | null;
  date_pilote_fin: string | null;
  date_renouvellement: string | null;
  montant: number | null;
  domaine_email: string | null;
  emails_autorises: string[] | null;
  note_interne: string | null;
  ecoutes: number;
};

async function fetchClients(): Promise<ClientRow[]> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, nom, type, pack_souscrit, statut, statut_paiement, date_pilote_fin, date_renouvellement, montant, domaine_email, emails_autorises, note_interne, spots(id)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const spotToClient = new Map<string, string>();
  for (const c of clients ?? []) for (const s of (c.spots as { id: string }[]) ?? []) spotToClient.set(s.id, c.id);

  const counts = new Map<string, number>();
  if (spotToClient.size) {
    const { data: ec } = await supabase.from("ecoutes").select("spot_id").in("spot_id", [...spotToClient.keys()]);
    for (const e of ec ?? []) {
      const cid = e.spot_id ? spotToClient.get(e.spot_id) : undefined;
      if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
  }
  return (clients ?? []).map(({ spots: _s, ...c }) => ({ ...c, ecoutes: counts.get(c.id) ?? 0 }));
}

const isPaid = (c: ClientRow) => c.statut_paiement === "Virement reçu";
const fmtEuro = (n: number) => n.toLocaleString("fr-FR");
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const monthYear = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

function ClientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("Tous");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["clients-b2b"],
    queryFn: fetchClients,
  });

  const activate = useMutation({
    mutationFn: async (c: ClientRow) => {
      const { error } = await supabase
        .from("clients")
        .update({ statut: "Actif annuel", statut_paiement: "Virement reçu" })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, c) => {
      toast.success(`${c.nom} est maintenant actif annuel`);
      qc.invalidateQueries({ queryKey: ["clients-b2b"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = { Tous: clients.length };
    for (const s of STATUTS) m[s] = clients.filter((c) => c.statut === s).length;
    return m;
  }, [clients]);

  const visible = clients.filter(
    (c) =>
      (filter === "Tous" || c.statut === filter) &&
      c.nom.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const revenus = clients.filter(isPaid).reduce((s, c) => s + (c.montant ?? 0), 0);
  const pending = clients.filter((c) => !isPaid(c) && c.statut !== "Suspendu");
  const pendingTotal = pending.reduce((s, c) => s + (c.montant ?? 0), 0);
  const actifs = clients.filter((c) => c.statut !== "Suspendu").length;

  function exportCsv() {
    const head = ["Nom", "Type", "Pack souscrit", "Statut", "Paiement", "Montant (€/an)", "Fin pilote", "Renouvellement", "Note interne", "Écoutes"];
    const rows = visible.map((c) => [
      c.nom, c.type ?? "", c.pack_souscrit ?? "", c.statut ?? "", c.statut_paiement ?? "", c.montant ?? "",
      c.date_pilote_fin ?? "", c.date_renouvellement ?? "", c.note_interne ?? "", c.ecoutes,
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-b2b.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function sendEmail(c: ClientRow) {
    const to = c.emails_autorises?.[0];
    if (!to) {
      toast.info("Aucun email enregistré pour ce client");
      return;
    }
    window.location.href = `mailto:${to}`;
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Clients B2B</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {actifs} comptes actifs · {counts["Pilote"] ?? 0} en pilote · {counts["Actif annuel"] ?? 0} actifs annuel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Exporter CSV
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nouveau client B2B
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-card p-4 md:flex-row">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {f.label} <span className="ml-1 text-[11px] opacity-80">({counts[f.key] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Établissement</th>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Pack</th>
              <th className="px-4 py-4">Statut</th>
              <th className="px-4 py-4">Paiement</th>
              <th className="px-4 py-4 text-right">Montant</th>
              <th className="px-4 py-4">Renouvellement</th>
              <th className="px-4 py-4">Alerte</th>
              <th className="px-4 py-4">Note interne</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">Chargement…</td></tr>
            )}
            {error && (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-destructive">Erreur : {(error as Error).message}</td></tr>
            )}
            {!isLoading && !error && visible.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">Aucun client</td></tr>
            )}
            {visible.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate({ to: "/admin/clients/$id", params: { id: c.id } })}
                className="cursor-pointer border-b last:border-0 transition hover:bg-secondary/40"
              >
                <td className="px-6 py-5">
                  <span className="font-semibold text-foreground">{c.nom}</span>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="text-primary">{c.ecoutes} écoutes</span>
                  </div>
                </td>
                <td className="px-4 py-5 text-muted-foreground">{c.type ?? "—"}</td>
                <td className="px-4 py-5 text-muted-foreground">{c.pack_souscrit ?? "—"}</td>
                <td className="px-4 py-5"><StatutBadge statut={c.statut} /></td>
                <td className="px-4 py-5"><Paiement c={c} /></td>
                <td className="px-4 py-5 text-right">
                  {c.montant != null ? (
                    <span className="font-mono text-xs font-semibold text-foreground">{fmtEuro(c.montant)} €/an</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-5 text-xs text-muted-foreground whitespace-nowrap">
                  {c.date_renouvellement ? monthYear(c.date_renouvellement) : "—"}
                </td>
                <td className="px-4 py-5"><Alerte c={c} /></td>
                <td className="max-w-44 truncate px-4 py-5 text-xs text-muted-foreground" title={c.note_interne ?? undefined}>
                  {c.note_interne || "—"}
                </td>
                <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn icon={Eye} label="Voir" onClick={() => navigate({ to: "/admin/clients/$id", params: { id: c.id } })} />
                    <ActionBtn icon={Mail} label="Email" onClick={() => sendEmail(c)} />
                    <ActionBtn icon={FileText} label="Facture" onClick={() => toast.info("Les factures arrivent bientôt")} />
                    {c.statut !== "Actif annuel" && c.statut !== "Suspendu" && (
                      <button
                        disabled={activate.isPending}
                        onClick={() => {
                          if (confirm(`Confirmer le virement reçu et activer ${c.nom} en Actif annuel ?`)) activate.mutate(c);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3 fill-current" /> Activer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Synthèse */}
      <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border bg-secondary p-5 md:flex-row md:items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Synthèse financière B2B</p>
          <div className="mt-1 flex flex-wrap gap-x-8 gap-y-1 font-semibold text-foreground">
            <span>Revenus annualisés (virements reçus) : <span className="text-primary">{fmtEuro(revenus)} €/an</span></span>
            <span className="text-muted-foreground">
              {pending.length} contrat{pending.length > 1 ? "s" : ""} en attente : <span className="text-foreground">{fmtEuro(pendingTotal)} €/an</span>
            </span>
          </div>
        </div>
      </div>

      <CreateClientDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

const PACKS = ["Découverte", "Essentiel", "Premium"] as const;
const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";

function CreateClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [pack, setPack] = useState<string>("Découverte");
  const [statut, setStatut] = useState<string>("En attente de paiement");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          nom: nom.trim(),
          type: type.trim() || null,
          pack_souscrit: pack,
          statut,
          emails_autorises: email.trim() ? [email.trim()] : null,
          note_interne: note.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Client créé");
      qc.invalidateQueries({ queryKey: ["clients-b2b"] });
      onClose();
      navigate({ to: "/admin/clients/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl font-bold text-foreground">Nouveau client B2B</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom *</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} placeholder="Ex. Hôtel du Lac" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type d'établissement</label>
            <input value={type} onChange={(e) => setType(e.target.value)} className={inputCls} placeholder="Ex. Hôtel, Spa, Cabinet…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pack souscrit</label>
              <select value={pack} onChange={(e) => setPack(e.target.value)} className={inputCls}>
                {PACKS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</label>
              <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputCls}>
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email de contact</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="contact@etablissement.fr" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note interne</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${inputCls} resize-y`} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary">
            Annuler
          </button>
          <button
            disabled={!nom.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? "Création…" : "Créer le client"}
          </button>
        </div>
      </div>
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

function Paiement({ c }: { c: ClientRow }) {
  if (isPaid(c))
    return (
      <div className="text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Virement reçu</div>
        {c.date_renouvellement && <div className="mt-0.5 text-muted-foreground">Renouv. {monthYear(c.date_renouvellement)}</div>}
      </div>
    );
  if (c.statut === "Pilote")
    return <div className="flex items-center gap-1.5 text-xs font-semibold text-warning-foreground"><Hourglass className="h-3.5 w-3.5" /> En attente virement</div>;
  return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> En attente</div>;
}

function Alerte({ c }: { c: ClientRow }) {
  // Badge orange : fin de pilote à 30 jours ou moins
  if (c.statut === "Pilote" && c.date_pilote_fin) {
    const d = daysUntil(c.date_pilote_fin);
    if (d <= 30)
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-warning-foreground/20 bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground">
          <AlertTriangle className="h-3 w-3" /> {d < 0 ? `Pilote terminé (J+${-d})` : `J-${d} fin pilote`}
        </span>
      );
  }
  // Badge jaune : renouvellement à 30 jours ou moins
  if (c.statut === "Actif annuel" && c.date_renouvellement) {
    const d = daysUntil(c.date_renouvellement);
    if (d <= 30)
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-warning-foreground/20 bg-warning/50 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
          <AlertTriangle className="h-3 w-3" /> {d < 0 ? "Renouvellement dépassé" : `J-${d} renouvellement`}
        </span>
      );
  }
  return <span className="text-muted-foreground">—</span>;
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: typeof Eye; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </button>
  );
}
