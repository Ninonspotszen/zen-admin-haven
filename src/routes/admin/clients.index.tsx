import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
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

const STATUTS = ["En attente de paiement", "Pilote", "Actif", "Suspendu"] as const;
type Filter = "Tous" | (typeof STATUTS)[number];
const FILTERS: { key: Filter; label: string }[] = [
  { key: "Tous", label: "Tous" },
  { key: "Pilote", label: "Pilote" },
  { key: "Actif", label: "Actif" },
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
  frequence_facturation: string | null;
  mode_acces: string | null;
  domaine_email: string | null;
  emails_autorises: string[] | null;
  note_interne: string | null;
  ecoutes: number;
};

async function fetchClients(): Promise<ClientRow[]> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, nom, type, pack_souscrit, statut, statut_paiement, date_pilote_fin, date_renouvellement, montant, frequence_facturation, mode_acces, domaine_email, emails_autorises, note_interne, spots(id)",
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
const annualAmount = (c: ClientRow) => (c.montant ?? 0) * (c.frequence_facturation?.toLowerCase() === "mensuel" ? 12 : 1);
const amountSuffix = (frequency: string | null) => frequency?.toLowerCase() === "mensuel" ? "€/mois" : frequency?.toLowerCase() === "annuel" ? "€/an" : "€";
const pilotDefaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
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
        .update({ statut: "Actif", statut_paiement: "Virement reçu" })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, c) => {
      toast.success(`${c.nom} est maintenant actif`);
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

  const revenus = clients.filter(isPaid).reduce((s, c) => s + annualAmount(c), 0);
  const pending = clients.filter((c) => !isPaid(c) && c.statut !== "Suspendu");
  const pendingTotal = pending.reduce((s, c) => s + annualAmount(c), 0);

  function exportCsv() {
    const head = ["Nom", "Type", "Pack souscrit", "Statut", "Paiement", "Montant (€)", "Fréquence", "Fin pilote", "Renouvellement", "Note interne", "Écoutes"];
    const rows = visible.map((c) => [
      c.nom, c.type ?? "", c.pack_souscrit ?? "", c.statut ?? "", c.statut_paiement ?? "", c.montant ?? "", c.frequence_facturation ?? "",
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
            {clients.length} clients · {counts["Pilote"] ?? 0} en pilote · {counts["Actif"] ?? 0} actifs · {counts["En attente de paiement"] ?? 0} en attente
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
      <div className="overflow-x-auto rounded-2xl border bg-card">
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
                  {c.mode_acces === "email_domaine" && c.domaine_email && (
                    <div className="mt-1">
                      <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">@{c.domaine_email}</span>
                    </div>
                  )}
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
                    <span className="font-mono text-xs font-semibold text-foreground">{fmtEuro(c.montant)} {amountSuffix(c.frequence_facturation)}</span>
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
                    {c.statut !== "Actif" && c.statut !== "Suspendu" && (
                      <button
                        disabled={activate.isPending}
                        onClick={() => {
                          if (confirm(`Confirmer le virement reçu et activer ${c.nom} en Actif ?`)) activate.mutate(c);
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


// Accès visiteurs : validation du domaine email professionnel
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const PUBLIC_MAIL_DOMAINS = ["gmail.com", "googlemail.com", "outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr", "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com", "me.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "gmx.fr", "gmx.com", "proton.me", "protonmail.com"];
const domainSchema = z
  .string()
  .min(1, "Le domaine email est obligatoire.")
  .regex(DOMAIN_RE, "Domaine invalide (ex. centric.com).")
  .refine((d) => !PUBLIC_MAIL_DOMAINS.includes(d), "Ce domaine est une messagerie grand public : tout le monde pourrait accéder.");
const normalizeDomain = (v: string) => v.trim().toLowerCase().replace(/^@+/, "");
function domainError(d: string): string | null {
  const r = domainSchema.safeParse(d);
  return r.success ? null : r.error.issues[0]?.message ?? "Domaine invalide";
}

function AccessModeFields({ mode, domaine, onMode, onDomaine, inputClass, name }: {
  mode: string; domaine: string; onMode: (v: string) => void; onDomaine: (v: string) => void; inputClass: string; name: string;
}) {
  const err = mode === "email_domaine" && domaine ? domainError(domaine) : null;
  const opts = [
    { v: "qr_libre", l: "Accès libre", h: "On scanne le QR code et on écoute." },
    { v: "email_domaine", l: "Email professionnel", h: "On reçoit un code sur son email pro." },
  ];
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accès des visiteurs</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <label key={o.v} className={`flex cursor-pointer gap-2 rounded-xl border px-3 py-2 text-sm ${mode === o.v ? "border-primary bg-primary/5" : "border-input"}`}>
            <input type="radio" name={name} value={o.v} checked={mode === o.v} onChange={() => onMode(o.v)} className="mt-1" />
            <span><span className="block font-semibold text-foreground">{o.l}</span><span className="block text-xs text-muted-foreground">{o.h}</span></span>
          </label>
        ))}
      </div>
      {mode === "email_domaine" && (
        <div className="mt-3">
          <label htmlFor={`${name}-domain`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domaine email autorisé *</label>
          <input id={`${name}-domain`} value={domaine} onChange={(e) => onDomaine(normalizeDomain(e.target.value))} placeholder="centric.com" className={inputClass} />
          {err ? (
            <p className="mt-1 text-xs text-destructive">{err}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Seules les adresses se terminant par @{domaine || "…"} pourront accéder aux audios.</p>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";

// Date de renouvellement = date_debut + mois_offerts + (1 mois si Mensuel, 12 mois si Annuel)
function computeRenewal(debut: string, moisOfferts: string, frequence: string): string {
  if (!debut) return "";
  const d = new Date(`${debut}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const offerts = Math.max(0, Math.round(Number(moisOfferts) || 0));
  const duree = frequence === "Mensuel" ? 1 : 12;
  d.setMonth(d.getMonth() + offerts + duree);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function CreateClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [statut, setStatut] = useState<string>("En attente de paiement");
  const [pilotEnd, setPilotEnd] = useState(pilotDefaultDate);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [frequence, setFrequence] = useState("");
  const [montant, setMontant] = useState("");
  const [moisOfferts, setMoisOfferts] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [renouvellement, setRenouvellement] = useState("");
  const [modeAcces, setModeAcces] = useState("qr_libre");
  const [domaine, setDomaine] = useState("");
  const domainInvalid = modeAcces === "email_domaine" && domainError(domaine) !== null;

  // Recalcule la date de renouvellement dès que début, mois offerts ou fréquence changent
  const updateBilling = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    const f = setter === setFrequence ? v : frequence;
    const m = setter === setMoisOfferts ? v : moisOfferts;
    const d = setter === setDateDebut ? v : dateDebut;
    const calc = computeRenewal(d, m, f);
    if (calc) setRenouvellement(calc);
  };

  const create = useMutation({
    mutationFn: async () => {
      let montantValue: number | null = null;
      if (montant.trim() !== "") {
        const m = Number(montant);
        if (!Number.isFinite(m) || m < 0) throw new Error("Montant invalide");
        montantValue = m;
      }
      let moisOffertsValue: number | null = null;
      if (moisOfferts.trim() !== "") {
        const mo = Number(moisOfferts);
        if (!Number.isInteger(mo) || mo < 0) throw new Error("Mois offerts invalide (entier ≥ 0)");
        moisOffertsValue = mo;
      }
      if (domainInvalid) throw new Error(domainError(domaine) ?? "Domaine invalide");
      const { data, error } = await supabase
        .from("clients")
        .insert({
          mode_acces: modeAcces,
          domaine_email: modeAcces === "email_domaine" ? domaine : null,
          nom: nom.trim(),
          type: type.trim() || null,
          statut,
          ...(statut === "Pilote" ? { date_pilote_fin: pilotEnd || null } : {}),
          emails_autorises: email.trim() ? [email.trim()] : null,
          note_interne: note.trim() || null,
          frequence_facturation: frequence || null,
          montant: montantValue,
          mois_offerts: moisOffertsValue,
          date_debut: dateDebut || null,
          date_renouvellement: renouvellement || null,
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
          <AccessModeFields mode={modeAcces} domaine={domaine} onMode={setModeAcces} onDomaine={setDomaine} inputClass={inputCls} name="new-access" />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</label>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputCls}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {statut === "Pilote" && (
            <div>
              <label htmlFor="new-pilot-end" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fin du pilote</label>
              <input id="new-pilot-end" type="date" value={pilotEnd} onChange={(e) => setPilotEnd(e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email de contact</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="contact@etablissement.fr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fréquence de facturation</label>
              <select value={frequence} onChange={(e) => updateBilling(setFrequence)(e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option value="Mensuel">Mensuel</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant (€)</label>
              <input type="number" min={0} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mois offerts</label>
              <input type="number" min={0} step={1} value={moisOfferts} onChange={(e) => updateBilling(setMoisOfferts)(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date de début</label>
              <input type="date" value={dateDebut} onChange={(e) => updateBilling(setDateDebut)(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date de renouvellement</label>
            <input type="date" value={renouvellement} onChange={(e) => setRenouvellement(e.target.value)} className={inputCls} />
            <p className="mt-1 text-xs text-muted-foreground">
              Calculée automatiquement : date de début + mois offerts + {frequence === "Mensuel" ? "1 mois" : "12 mois"} — modifiable manuellement
            </p>
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
            disabled={!nom.trim() || domainInvalid || create.isPending}
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
    "Actif": "bg-accent text-accent-foreground",
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
  // Fin de pilote : terminé ou dans les sept prochains jours
  if (c.statut === "Pilote" && c.date_pilote_fin) {
    const d = daysUntil(c.date_pilote_fin);
    if (d < 0) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"><AlertTriangle className="h-3 w-3" /> Pilote terminé</span>;
    if (d <= 7)
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-warning-foreground/20 bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground">
          <AlertTriangle className="h-3 w-3" /> {`J-${d} fin pilote`}
        </span>
      );
  }
  // Badge jaune : renouvellement à 30 jours ou moins
  if (c.statut === "Actif" && c.date_renouvellement) {
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
