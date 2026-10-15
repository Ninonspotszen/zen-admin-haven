import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  AlertTriangle,
  Music,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Spots Zen Admin" },
      { name: "description", content: "Vue de synthèse globale de l'activité Spots Zen." },
      { property: "og:title", content: "Dashboard — Spots Zen Admin" },
      { property: "og:description", content: "Vue de synthèse globale de l'activité Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

type DashboardData = {
  clientsActifs: number;
  clientsPilote: number;
  renouvellements: { id: string; nom: string; date_renouvellement: string | null }[];
  abonnesActifs: number;
  deltaMois: number;
  pilotesExpirant: { id: string; nom: string; date_pilote_fin: string | null }[];
  abonnesExpirant: { id: string; email: string; date_fin_acces: string | null }[];
  virementsRecus: number;
  paiementsEchoues: { id: string; email: string }[];
  topAudio: { audio_id: string; nb_ecoutes: number; titre: string | null } | null;
};

async function fetchDashboard(): Promise<DashboardData> {
  const now = new Date();
  const localDay = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = localDay(0);
  const in30 = localDay(30);
  const in7 = localDay(7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [
    actifs,
    pilote,
    renouvellements,
    abonnesActifs,
    abonnesMois,
    abonnesMoisPrec,
    pilotesExpirant,
    abonnesExpirant,
    virementsRecus,
    paiementsEchoues,
    ecoutes,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("statut", "Actif"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("statut", "Pilote"),
    supabase.from("clients").select("id, nom, date_renouvellement").eq("statut", "Actif").lte("date_renouvellement", in30).not("date_renouvellement", "is", null).order("date_renouvellement"),
    supabase.from("abonnes_b2c").select("id", { count: "exact", head: true }).eq("statut", "actif"),
    supabase.from("abonnes_b2c").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("abonnes_b2c").select("id", { count: "exact", head: true }).gte("created_at", prevMonthStart).lt("created_at", monthStart),
    supabase.from("clients").select("id, nom, date_pilote_fin").eq("statut", "Pilote").lte("date_pilote_fin", in30).not("date_pilote_fin", "is", null).order("date_pilote_fin"),
    supabase.from("abonnes_b2c").select("id, email, date_fin_acces").in("statut", ["offert", "ambassadeur"]).gte("date_fin_acces", today).lte("date_fin_acces", in7).not("date_fin_acces", "is", null).order("date_fin_acces"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("statut_paiement", "Virement reçu"),
    // Statut posé par le webhook Stripe (invoice.payment_failed) pendant les relances.
    supabase.from("abonnes_b2c").select("id, email").eq("statut", "paiement_echoue").order("email"),
    supabase.from("ecoutes").select("audio_id"),
  ]);

  // Top audio : groupement côté front (pas de GROUP BY via l'API)
  let topAudio: DashboardData["topAudio"] = null;
  const counts = new Map<string, number>();
  for (const row of ecoutes.data ?? []) {
    if (row.audio_id) counts.set(row.audio_id, (counts.get(row.audio_id) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const { data: trad } = await supabase
      .from("audios_traductions")
      .select("titre")
      .eq("audio_id", top[0])
      .eq("langue", "fr")
      .maybeSingle();
    topAudio = { audio_id: top[0], nb_ecoutes: top[1], titre: trad?.titre ?? null };
  }

  return {
    clientsActifs: actifs.count ?? 0,
    clientsPilote: pilote.count ?? 0,
    renouvellements: renouvellements.data ?? [],
    abonnesActifs: abonnesActifs.count ?? 0,
    deltaMois: (abonnesMois.count ?? 0) - (abonnesMoisPrec.count ?? 0),
    pilotesExpirant: pilotesExpirant.data ?? [],
    abonnesExpirant: abonnesExpirant.data ?? [],
    virementsRecus: virementsRecus.count ?? 0,
    paiementsEchoues: paiementsEchoues.data ?? [],
    topAudio,
  };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(d: string | null) {
  if (!d) return false;
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  return d.slice(0, 10) < today;
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: fetchDashboard });
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      {/* Bloc 5 — Header */}
      <div>
        <h1 className="font-serif text-3xl text-foreground">Bonjour Ninon</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{today}</p>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Chargement de la synthèse…</p>
      ) : (
        <>
          {/* Blocs 1 & 2 — Clients B2B & Abonnés B2C */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} label="Clients actifs" value={data.clientsActifs} hint="Actif" href="/admin/clients" />
            <StatCard icon={Building2} label="Clients en pilote" value={data.clientsPilote} href="/admin/clients" />
            <StatCard
              icon={Users}
              label="Abonnés actifs"
              value={data.abonnesActifs}
              hint={`${data.deltaMois >= 0 ? "+" : ""}${data.deltaMois} ce mois`}
              href="/admin/abonnes"
            />
            <StatCard icon={Wallet} label="Panier moyen" value="—" hint="Bientôt disponible" />
          </div>

          {/* Prochains renouvellements */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-serif text-lg text-foreground">Prochains renouvellements (30 jours)</h2>
            {data.renouvellements.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucun renouvellement prévu.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.renouvellements.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <Link to="/admin/clients/$id" params={{ id: c.id }} className="font-medium text-foreground hover:underline">
                      {c.nom}
                    </Link>
                    {isOverdue(c.date_renouvellement) ? (
                      <span className="text-destructive">{fmtDate(c.date_renouvellement)} · en retard</span>
                    ) : (
                      <span className="text-muted-foreground">{fmtDate(c.date_renouvellement)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Bloc 3 — Alertes */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-serif text-lg text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertes
            </h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pilotes expirant sous 30 j</h3>
                {data.pilotesExpirant.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Aucun.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {data.pilotesExpirant.map((c) => (
                      <li key={c.id} className="flex items-center justify-between">
                        <Link to="/admin/clients/$id" params={{ id: c.id }} className="text-foreground hover:underline">{c.nom}</Link>
                        <span className="text-amber-700">{fmtDate(c.date_pilote_fin)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abonnés B2C expirant sous 7 j</h3>
                {data.abonnesExpirant.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Aucun.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {data.abonnesExpirant.map((a) => (
                      <li key={a.id} className="flex items-center justify-between">
                        <Link to="/admin/abonnes/$id" params={{ id: a.id }} className="text-foreground hover:underline">{a.email}</Link>
                        <span className="text-amber-700">{fmtDate(a.date_fin_acces)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alertes Stripe B2C / paiements échoués</h3>
                {data.paiementsEchoues.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Aucun paiement en échec</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {data.paiementsEchoues.map((a) => (
                      <li key={a.id}>
                        <Link to="/admin/abonnes/$id" params={{ id: a.id }} className="text-amber-700 hover:underline">{a.email}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paiements B2B</h3>
                <p className="mt-2 text-sm text-foreground">{data.virementsRecus} virement{data.virementsRecus > 1 ? "s" : ""} reçu{data.virementsRecus > 1 ? "s" : ""}</p>
              </div>
            </div>
          </section>

          {/* Bloc 4 — Top audio */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-serif text-lg text-foreground">
              <Music className="h-4 w-4 text-primary" /> Top audio
            </h2>
            {data.topAudio ? (
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{data.topAudio.titre ?? "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground">{data.topAudio.nb_ecoutes} écoute{data.topAudio.nb_ecoutes > 1 ? "s" : ""}</p>
                </div>
                <Link to="/admin/audios/$id" params={{ id: data.topAudio.audio_id }} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  Voir la fiche <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Aucune écoute enregistrée pour l'instant.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className={cn("rounded-2xl border bg-card p-5", href && "transition-colors hover:border-primary/40")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-serif text-3xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
