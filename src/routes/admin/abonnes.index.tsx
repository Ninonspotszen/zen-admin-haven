import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gift, Search, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { giftAccess } from "@/lib/abonnes.functions";

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
  spot_origine_id: string | null;
  date_fin_prevue?: string | null;
  spot_label?: string | null;
};

const fmtFr = (v: string) => { const [y, m, d] = v.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };

export const STATUTS = ["actif", "ambassadeur", "offert", "inactif", "paiement_echoue", "resilie"] as const;

export const STATUT_STYLE: Record<string, string> = {
  actif: "bg-primary/15 text-primary",
  ambassadeur: "bg-amber-100 text-amber-800 border border-amber-300",
  offert: "bg-accent text-accent-foreground",
  inactif: "bg-secondary text-muted-foreground",
  paiement_echoue: "bg-destructive/15 text-destructive",
  resilie: "bg-muted text-muted-foreground line-through",
};

export function StatutBadge({ statut }: { statut: string | null }) {
  const s = statut ?? "inactif";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUT_STYLE[s] ?? "bg-secondary text-muted-foreground"}`}>
      {s === "ambassadeur" && <Sparkles className="h-3 w-3" />}
      {s === "offert" && <Gift className="h-3 w-3" />}
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function AbonnesPage() {
  const navigate = useNavigate();
  const [statut, setStatut] = useState<string>("Tous");
  const [formule, setFormule] = useState<string>("Toutes");
  const [search, setSearch] = useState("");
  const [gifting, setGifting] = useState(false);

  const { data: abonnes = [], isLoading, error } = useQuery({
    queryKey: ["abonnes"],
    queryFn: async (): Promise<Abonne[]> => {
      const { data, error } = await supabase
        .from("abonnes_b2c")
        .select("id, email, prenom, formule, statut, date_fin_acces, langue_preferee, spot_origine_id, date_fin_prevue" as "id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Abonne[];
      const ids = [...new Set(rows.map((r) => r.spot_origine_id).filter((v): v is string => !!v))];
      const labels: Record<string, string> = {};
      if (ids.length) {
        const { data: spots } = await supabase.from("spots").select("id, nom, client:client_id(nom)").in("id", ids);
        for (const s of (spots ?? []) as { id: string; nom: string | null; client: { nom: string | null } | null }[]) {
          labels[s.id] = [s.nom, s.client?.nom].filter(Boolean).join(" — ");
        }
      }
      return rows.map((r) => ({ ...r, spot_label: r.spot_origine_id ? labels[r.spot_origine_id] ?? null : null }));
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
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Abonnés & Ambassadeurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {abonnes.length} abonnés · {counts["actif"]} actifs · {counts["ambassadeur"]} ambassadeurs · {counts["offert"]} accès offerts
          </p>
        </div>
        <button
          onClick={() => setGifting(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Gift className="h-4 w-4" /> Offrir un accès
        </button>
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
              <th className="px-4 py-4">Spot d'origine</th>
              <th className="px-4 py-4">Fin d'accès</th>
              <th className="px-6 py-4">Langue</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Chargement…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-destructive">Erreur : {(error as Error).message}</td></tr>
            )}
            {!isLoading && !error && visible.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Aucun abonné</td></tr>
            )}
            {visible.map((a) => (
              <tr
                key={a.id}
                onClick={() => navigate({ to: "/admin/abonnes/$id", params: { id: a.id } })}
                className="cursor-pointer border-b last:border-0 transition hover:bg-secondary/40"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {a.statut === "offert" && <Gift className="h-3.5 w-3.5 text-accent-foreground" />}
                    {a.email}
                  </div>
                  {a.prenom && <div className="mt-0.5 text-xs text-muted-foreground">{a.prenom}</div>}
                </td>
                <td className="px-4 py-4 text-foreground">{a.formule ?? "—"}</td>
                <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5"><StatutBadge statut={a.statut} />{a.date_fin_prevue && (a.statut === "actif" || a.statut === "paiement_echoue") && (<span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">Résiliation prévue · {fmtFr(a.date_fin_prevue)}</span>)}</div></td>
                <td className="px-4 py-4 text-foreground">{a.spot_label || "—"}</td>
                <td className="px-4 py-4 tabular-nums text-foreground">
                  {a.date_fin_acces ? new Date(a.date_fin_acces).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-6 py-4 uppercase text-muted-foreground">{a.langue_preferee ?? "fr"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gifting && <GiftAccessPanel onClose={() => setGifting(false)} />}
    </div>
  );
}

function GiftAccessPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [spotId, setSpotId] = useState("");
  const [duree, setDuree] = useState("30");
  const [codeParrainage, setCodeParrainage] = useState("");
  const [message, setMessage] = useState("");

  const { data: spots = [] } = useQuery({
    queryKey: ["spots-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spots").select("id, nom").order("nom");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gift = useMutation({
    mutationFn: () =>
      giftAccess({
        data: {
          prenom: prenom || undefined,
          nom: nom || undefined,
          email: email.trim(),
          spotId: spotId || undefined,
          dureeJours: Number(duree) || 30,
          codeParrainage: codeParrainage || undefined,
          message: message || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success(
        r.webhookSent
          ? "Accès offert créé et email déclenché"
          : "Accès offert créé (webhook Make non configuré — aucun email envoyé)",
      );
      qc.invalidateQueries({ queryKey: ["abonnes"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
  const label = "mb-1 block text-xs font-semibold text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) toast.error("L'email est obligatoire");
          else gift.mutate();
        }}
        className="h-full w-full max-w-md overflow-y-auto border-l bg-card p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground">
            <Gift className="h-5 w-5 text-primary" /> Nouvel accès offert
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Prénom</label>
              <input className={input} value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={100} />
            </div>
            <div>
              <label className={label}>Nom</label>
              <input className={input} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} />
            </div>
          </div>
          <div>
            <label className={label}>Email *</label>
            <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoFocus />
          </div>
          <div>
            <label className={label}>Spot associé</label>
            <select className={input} value={spotId} onChange={(e) => setSpotId(e.target.value)}>
              <option value="">Aucun</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>{s.nom ?? s.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Durée d'accès (jours)</label>
            <input className={input} type="number" min={1} max={365} value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
          <div>
            <label className={label}>Code parrainage (optionnel)</label>
            <input className={input} value={codeParrainage} onChange={(e) => setCodeParrainage(e.target.value)} maxLength={50} />
            <p className="mt-1 text-xs text-muted-foreground">
              Si un code parrainage est renseigné, l'ambassadeur associé sera notifié.
            </p>
          </div>
          <div>
            <label className={label}>Message personnalisé (optionnel)</label>
            <textarea className={`${input} min-h-24`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-input px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
            Annuler
          </button>
          <button
            type="submit"
            disabled={gift.isPending}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {gift.isPending ? "Envoi…" : "Envoyer l'accès"}
          </button>
        </div>
      </form>
    </div>
  );
}
