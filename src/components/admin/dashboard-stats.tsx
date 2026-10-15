import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Headphones, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dashboard admin (livrable 8 du jury Lion) : statistiques d'écoute, clients B2C et spots.
 * Temps réel : un canal Supabase Realtime écoute les tables ecoutes, acces_spots et abonnes_b2c ;
 * à chaque changement, les chiffres de la page sont relus (aucun rechargement manuel).
 * Les écoutes sont anonymes (décision RGPD) : toutes les statistiques sont globales, par audio et par spot.
 */

export type Periode = "7" | "30" | "tout";
export type LiveStatus = "connexion" | "direct" | "coupe";

// Durées d'écoute fiables depuis la mise en ligne du nouveau lecteur (15/10/2026, midi) :
// avant, chaque écoute était enregistrée avec ≈ 5 s. Le % d'écoute complète ne compte que les écoutes après.
const DUREES_FIABLES_DEPUIS = "2026-10-15T10:00:00Z";
const PRIX_MENSUEL = 5;
const PRIX_ANNUEL = 49;
const LANGUES: Record<string, string> = {
  fr: "Français",
  en: "Anglais",
  de: "Allemand",
  nl: "Néerlandais",
  es: "Espagnol",
};
const VOIX: Record<string, string> = {
  feminine: "Voix féminine",
  masculine: "Voix masculine",
  aucune: "Musique (sans voix)",
};
const MOMENTS = ["Matin", "Journée", "Soir", "Nuit"] as const;
export const STATUT_LABEL: Record<string, string> = {
  actif: "actif",
  offert: "offert",
  ambassadeur: "ambassadeur",
  paiement_echoue: "paiement échoué",
  resilie: "résilié",
  inactif: "inactif",
};

/* ---------- Temps réel ---------- */

export function useDashboardLive(qc: QueryClient) {
  const [status, setStatus] = useState<LiveStatus>("connexion");
  const [derniere, setDerniere] = useState<Date | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Plusieurs changements rapprochés = une seule relecture.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
        setDerniere(new Date());
      }, 800);
    };
    const channel = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ecoutes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "acces_spots" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "abonnes_b2c" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, refresh)
      .subscribe((s) =>
        setStatus(
          s === "SUBSCRIBED"
            ? "direct"
            : s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED"
              ? "coupe"
              : "connexion",
        ),
      );
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);
  return { status, derniere };
}

export function LiveBadge({ status, derniere }: { status: LiveStatus; derniere: Date | null }) {
  const txt =
    status === "direct"
      ? "En direct"
      : status === "connexion"
        ? "Connexion au direct…"
        : "Direct indisponible : mise à jour chaque minute";
  const dot =
    status === "direct" ? "bg-green-600" : status === "connexion" ? "bg-amber-500" : "bg-red-600";
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-2 w-2 rounded-full ${dot} ${status === "direct" ? "animate-pulse" : ""}`}
        aria-hidden
      />
      {txt}
      {derniere && status === "direct" && (
        <span>
          · dernier changement à{" "}
          {derniere.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
    </p>
  );
}

/* ---------- Données ---------- */

type Ecoute = {
  audio_id: string | null;
  spot_id: string | null;
  langue: string | null;
  voix: string | null;
  duree_ecoute_sec: number | null;
  timestamp: string | null;
};
type Abonne = {
  statut: string | null;
  formule: string | null;
  created_at: string | null;
  date_fin_prevue: string | null;
  spot_origine_id: string | null;
  parrain_id: string | null;
  langue_preferee: string | null;
};

const jourParis = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));
const heureParis = (iso: string) =>
  Number(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso)),
  );
const momentDe = (h: number) =>
  h >= 6 && h < 12 ? "Matin" : h >= 12 && h < 17 ? "Journée" : h >= 17 && h < 22 ? "Soir" : "Nuit";
const fmtDuree = (sec: number) =>
  sec < 60
    ? `${Math.round(sec)} s`
    : sec < 3600
      ? `${Math.round(sec / 60)} min`
      : `${(sec / 3600).toFixed(1).replace(".", ",")} h`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} % (${a} sur ${b})` : "—");
const fmtJour = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const ilYa = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
};

// L'API renvoie 1 000 lignes maximum par appel : on lit par pages.
async function lireToutesLesEcoutes(depuis: string | null): Promise<Ecoute[]> {
  const out: Ecoute[] = [];
  for (let page = 0; page < 20; page++) {
    let q = supabase
      .from("ecoutes")
      .select("audio_id, spot_id, langue, voix, duree_ecoute_sec, timestamp")
      .order("timestamp", { ascending: false });
    if (depuis) q = q.gte("timestamp", depuis);
    const { data, error } = await q.range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function fetchStats(periode: Periode) {
  const depuis =
    periode === "tout" ? null : new Date(Date.now() - Number(periode) * 86400000).toISOString();
  const il7j = new Date(Date.now() - 7 * 86400000).toISOString();
  let visites = supabase.from("acces_spots").select("spot_id, premiere_visite");
  if (depuis) visites = visites.gte("premiere_visite", depuis);

  const [ecoutes, audios, spots, acces, abonnes, recentes, actifs7j] = await Promise.all([
    lireToutesLesEcoutes(depuis),
    supabase.from("audios").select("id, titre_fr, duree_secondes"),
    supabase.from("spots").select("id, nom, statut"),
    visites,
    supabase
      .from("abonnes_b2c")
      .select(
        "statut, formule, created_at, date_fin_prevue, spot_origine_id, parrain_id, langue_preferee",
      ),
    supabase
      .from("ecoutes")
      .select("audio_id, spot_id, langue, voix, duree_ecoute_sec, timestamp")
      .order("timestamp", { ascending: false })
      .limit(8),
    supabase.from("ecoutes").select("spot_id").gte("timestamp", il7j).not("spot_id", "is", null),
  ]);
  for (const r of [audios, spots, acces, abonnes, recentes, actifs7j]) if (r.error) throw r.error;
  return {
    depuis,
    ecoutes,
    audios: audios.data ?? [],
    spots: spots.data ?? [],
    acces: acces.data ?? [],
    abonnes: (abonnes.data ?? []) as Abonne[],
    recentes: (recentes.data ?? []) as Ecoute[],
    spotsActifs7j: new Set((actifs7j.data ?? []).map((r) => r.spot_id as string)),
  };
}

/* ---------- Présentation ---------- */

const AXE = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
  color: "var(--foreground)",
};

function Bloc({
  icon: Icon,
  titre,
  sousTitre,
  children,
}: {
  icon: typeof Users;
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-2xl text-foreground">
          <Icon className="h-5 w-5 text-primary" aria-hidden /> {titre}
        </h2>
        {sousTitre && <p className="mt-1 text-xs text-muted-foreground">{sousTitre}</p>}
      </div>
      {children}
    </section>
  );
}

function Carte({
  titre,
  aide,
  children,
  className = "",
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-5 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </h3>
      {aide && <p className="mt-0.5 text-[11px] text-muted-foreground">{aide}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Chiffre({
  label,
  valeur,
  aide,
}: {
  label: string;
  valeur: string | number;
  aide?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl text-foreground">{valeur}</p>
      {aide && <p className="mt-0.5 text-xs text-muted-foreground">{aide}</p>}
    </div>
  );
}

// Tableau lu par les lecteurs d'écran à la place du graphique.
function TableAccessible({
  caption,
  cols,
  rows,
}: {
  caption: string;
  cols: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) => (
              <td key={j}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Vide({ children = "Aucune donnée sur la période." }: { children?: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Barres({
  data,
  cle,
  nom,
  hauteur = 220,
  horizontal = false,
  label,
}: {
  data: Record<string, string | number>[];
  cle: string;
  nom: string;
  hauteur?: number;
  horizontal?: boolean;
  label: string;
}) {
  return (
    <div style={{ height: hauteur }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        {horizontal ? (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tick={AXE}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey={label}
              tick={AXE}
              axisLine={false}
              tickLine={false}
              width={150}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--secondary)" }}
              formatter={(v) => [v, nom]}
            />
            <Bar dataKey={cle} fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey={label} tick={AXE} axisLine={false} tickLine={false} />
            <YAxis tick={AXE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--secondary)" }}
              formatter={(v) => [v, nom]}
            />
            <Bar dataKey={cle} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Composant principal ---------- */

export function DashboardStats({ live }: { live: LiveStatus }) {
  const [periode, setPeriode] = useState<Periode>("30");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats", periode],
    queryFn: () => fetchStats(periode),
    // Si le direct est coupé, on relit quand même chaque minute.
    refetchInterval: live === "coupe" ? 60_000 : false,
  });

  const s = useMemo(() => (data ? calculer(data, periode) : null), [data, periode]);
  const libellePeriode =
    periode === "tout" ? "depuis le début" : `sur les ${periode} derniers jours`;

  return (
    <div className="space-y-10">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Période des statistiques"
      >
        <span className="text-sm text-muted-foreground">Période :</span>
        {(["7", "30", "tout"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriode(p)}
            aria-pressed={periode === p}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${periode === p ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}
          >
            {p === "tout" ? "Depuis le début" : `${p} jours`}
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Les statistiques n'ont pas pu être chargées ({(error as Error).message}). Rechargez la
          page dans un instant.
        </p>
      ) : isLoading || !s ? (
        <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
      ) : (
        <>
          {/* ---------------- Écoutes ---------------- */}
          <Bloc
            icon={Headphones}
            titre="Écoutes"
            sousTitre={`Toutes les écoutes (spots et bibliothèque des abonnés), ${libellePeriode}. Les écoutes sont anonymes.`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Chiffre label="Écoutes" valeur={s.nbEcoutes} />
              <Chiffre label="Temps d'écoute" valeur={fmtDuree(s.totalSec)} />
              <Chiffre
                label="Durée moyenne"
                valeur={s.nbEcoutes ? fmtDuree(s.totalSec / s.nbEcoutes) : "—"}
                aide="par écoute"
              />
              <Chiffre
                label="Écoutes complètes"
                valeur={
                  s.completes.total
                    ? `${Math.round((s.completes.ok / s.completes.total) * 100)} %`
                    : "—"
                }
                aide={
                  s.completes.total
                    ? `${s.completes.ok} sur ${s.completes.total} · au moins 90 % de l'audio`
                    : "mesuré depuis le 15/10/2026"
                }
              />
            </div>

            <Carte titre="Écoutes par jour" aide="Heure de Paris · se met à jour en direct">
              {s.nbEcoutes === 0 ? (
                <Vide />
              ) : (
                <>
                  <div style={{ height: 240 }} aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={s.parJour}
                        margin={{ left: -16, right: 12, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="jour"
                          tick={AXE}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={fmtJour}
                          minTickGap={24}
                        />
                        <YAxis tick={AXE} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelFormatter={(d) => fmtJour(String(d))}
                          formatter={(v, _n, p) => [
                            `${v} écoute${Number(v) > 1 ? "s" : ""} · ${fmtDuree((p.payload as { sec: number }).sec)}`,
                            "Écoutes",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="ecoutes"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          dot={s.parJour.length <= 31 ? { r: 3, fill: "var(--primary)" } : false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <TableAccessible
                    caption="Écoutes par jour"
                    cols={["Jour", "Écoutes", "Temps"]}
                    rows={s.parJour.map((d) => [d.jour, d.ecoutes, fmtDuree(d.sec)])}
                  />
                </>
              )}
            </Carte>

            <div className="grid gap-4 lg:grid-cols-2">
              <Carte
                titre="Top audios"
                aide="Minutes écoutées · % d'écoute complète entre parenthèses"
              >
                {s.topAudios.length === 0 ? (
                  <Vide />
                ) : (
                  <>
                    <Barres
                      data={s.topAudios}
                      cle="minutes"
                      nom="Minutes écoutées"
                      label="titre"
                      horizontal
                      hauteur={Math.max(160, s.topAudios.length * 34)}
                    />
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {s.topAudios.map((a) => (
                        <li key={a.id} className="flex justify-between gap-2">
                          <Link
                            to="/admin/audios/$id"
                            params={{ id: a.id }}
                            className="truncate text-foreground hover:underline"
                          >
                            {a.titre}
                          </Link>
                          <span className="shrink-0">
                            {a.ecoutes} écoute{a.ecoutes > 1 ? "s" : ""} · {a.completes}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <TableAccessible
                      caption="Top audios"
                      cols={["Audio", "Écoutes", "Minutes", "Écoutes complètes"]}
                      rows={s.topAudios.map((a) => [a.titre, a.ecoutes, a.minutes, a.completes])}
                    />
                  </>
                )}
              </Carte>

              <Carte
                titre="Moment de la journée"
                aide="Heure de Paris · Matin 6-12 h · Journée 12-17 h · Soir 17-22 h · Nuit 22-6 h"
              >
                {s.nbEcoutes === 0 ? (
                  <Vide />
                ) : (
                  <>
                    <Barres data={s.parMoment} cle="ecoutes" nom="Écoutes" label="moment" />
                    <TableAccessible
                      caption="Écoutes par moment de la journée"
                      cols={["Moment", "Écoutes"]}
                      rows={s.parMoment.map((m) => [m.moment, m.ecoutes])}
                    />
                  </>
                )}
              </Carte>

              <Carte titre="Langue d'écoute">
                {s.nbEcoutes === 0 ? (
                  <Vide />
                ) : (
                  <>
                    <Barres data={s.parLangue} cle="ecoutes" nom="Écoutes" label="langue" />
                    <TableAccessible
                      caption="Écoutes par langue"
                      cols={["Langue", "Écoutes"]}
                      rows={s.parLangue.map((l) => [l.langue, l.ecoutes])}
                    />
                  </>
                )}
              </Carte>

              <Carte titre="Voix choisie">
                {s.nbEcoutes === 0 ? (
                  <Vide />
                ) : (
                  <ul className="space-y-3">
                    {s.parVoix.map((v) => (
                      <li key={v.voix}>
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{v.voix}</span>
                          <span className="text-muted-foreground">
                            {pct(v.ecoutes, s.nbEcoutes)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-secondary" aria-hidden>
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${(v.ecoutes / s.nbEcoutes) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Carte>
            </div>

            <Carte titre="Dernières écoutes" aide="Les 8 plus récentes, toutes périodes · anonymes">
              {s.recentes.length === 0 ? (
                <Vide>Aucune écoute enregistrée pour l'instant.</Vide>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {s.recentes.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-foreground">{e.titre}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.lieu} · {e.langue} · {e.duree} · {e.quand}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Carte>
          </Bloc>

          {/* ---------------- Clients B2C ---------------- */}
          <Bloc
            icon={Users}
            titre="Clients B2C"
            sousTitre="Abonnés de la bibliothèque. Les comptes de test sont inclus tant qu'ils ne sont pas supprimés."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Chiffre
                label="Accès en cours"
                valeur={s.b2c.avecAcces}
                aide="actifs, paiement échoué, offerts et ambassadeurs"
              />
              <Chiffre
                label="Revenu mensuel estimé"
                valeur={`${s.b2c.mrr.toFixed(2).replace(".", ",")} €`}
                aide={`${s.b2c.mensuels} mensuel${s.b2c.mensuels > 1 ? "s" : ""} × 5 € · ${s.b2c.annuels} annuel${s.b2c.annuels > 1 ? "s" : ""} × 49 €/12 · essais inclus`}
              />
              <Chiffre
                label="Résiliations programmées"
                valeur={s.b2c.resiliationsProgrammees.length}
                aide={
                  s.b2c.resiliationsProgrammees[0]
                    ? `prochaine le ${new Date(s.b2c.resiliationsProgrammees[0]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                    : "aucune à venir"
                }
              />
              <Chiffre
                label="Venus d'un spot"
                valeur={pct(s.b2c.venusDunSpot, s.b2c.total)}
                aide={`parrainés : ${pct(s.b2c.parraines, s.b2c.total)}`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Carte titre="Inscriptions par semaine" aide="12 dernières semaines · tous statuts">
                {s.b2c.total === 0 ? (
                  <Vide>Aucun abonné pour l'instant.</Vide>
                ) : (
                  <>
                    <Barres
                      data={s.b2c.parSemaine}
                      cle="inscriptions"
                      nom="Inscriptions"
                      label="semaine"
                    />
                    <TableAccessible
                      caption="Inscriptions par semaine"
                      cols={["Semaine du", "Inscriptions"]}
                      rows={s.b2c.parSemaine.map((w) => [w.semaine, w.inscriptions])}
                    />
                  </>
                )}
              </Carte>

              <Carte titre="Répartition des abonnés">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Par statut</dt>
                    <dd className="mt-1 space-y-0.5">
                      {s.b2c.statuts.map(([k, n]) => (
                        <p key={k}>
                          <span className="text-foreground">{n}</span>{" "}
                          <span className="text-muted-foreground">{k}</span>
                        </p>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Langue préférée</dt>
                    <dd className="mt-1 space-y-0.5">
                      {s.b2c.langues.map(([k, n]) => (
                        <p key={k}>
                          <span className="text-foreground">{n}</span>{" "}
                          <span className="text-muted-foreground">{k}</span>
                        </p>
                      ))}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">
                      Écoutes dans la bibliothèque ({libellePeriode})
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {s.b2c.ecoutesBiblio} écoute{s.b2c.ecoutesBiblio > 1 ? "s" : ""} ·{" "}
                      {fmtDuree(s.b2c.secBiblio)}
                      {s.b2c.topBiblio && (
                        <span className="text-muted-foreground">
                          {" "}
                          · la plus écoutée : {s.b2c.topBiblio}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Carte>
            </div>
          </Bloc>

          {/* ---------------- Spots ---------------- */}
          <Bloc
            icon={MapPin}
            titre="Spots"
            sousTitre={`Activité par lieu, ${libellePeriode}. « Visiteurs » = premières visites via le QR code (un téléphone compte une fois par spot).`}
          >
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Activité par spot</caption>
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Spot",
                      "Visiteurs",
                      "Écoutes",
                      "Écoutes / visiteur",
                      "Temps",
                      "Abonnés issus",
                      "Audio préféré",
                      "Dernière écoute",
                    ].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.spots.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-4 py-3">
                        {r.id === "biblio" ? (
                          <span className="text-foreground">Bibliothèque (abonnés)</span>
                        ) : (
                          <Link
                            to="/admin/spots/$id"
                            params={{ id: r.id }}
                            className="text-foreground hover:underline"
                          >
                            {r.nom}
                          </Link>
                        )}
                        {r.dormant && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            ⚠ aucune écoute depuis 7 j
                          </span>
                        )}
                        {r.inactif && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            inactif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.id === "biblio" ? "—" : r.visiteurs}</td>
                      <td className="px-4 py-3">{r.ecoutes}</td>
                      <td className="px-4 py-3">
                        {r.id === "biblio" || !r.visiteurs
                          ? "—"
                          : (r.ecoutes / r.visiteurs).toFixed(1).replace(".", ",")}
                      </td>
                      <td className="px-4 py-3">{fmtDuree(r.sec)}</td>
                      <td className="px-4 py-3">{r.id === "biblio" ? "—" : r.abonnes}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.top ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.derniere ? ilYa(r.derniere) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Bloc>
        </>
      )}
    </div>
  );
}

/* ---------- Calculs ---------- */

function calculer(d: Awaited<ReturnType<typeof fetchStats>>, periode: Periode) {
  const titres = new Map(d.audios.map((a) => [a.id, a.titre_fr ?? "Sans titre"]));
  const durees = new Map(d.audios.map((a) => [a.id, a.duree_secondes ?? 0]));
  const nomsSpots = new Map(d.spots.map((sp) => [sp.id, sp.nom ?? "Spot sans nom"]));
  const ecoutes = d.ecoutes.filter((e) => e.timestamp);
  const sec = (e: Ecoute) => e.duree_ecoute_sec ?? 0;
  const estComplete = (e: Ecoute) => {
    const duree = e.audio_id ? (durees.get(e.audio_id) ?? 0) : 0;
    return duree > 0 && sec(e) >= duree * 0.9;
  };
  const fiable = (e: Ecoute) =>
    (e.timestamp ?? "") >= DUREES_FIABLES_DEPUIS &&
    !!e.audio_id &&
    (durees.get(e.audio_id) ?? 0) > 0;

  // Écoutes par jour (série continue, jours sans écoute à 0)
  const jours = new Map<string, { ecoutes: number; sec: number }>();
  for (const e of ecoutes) {
    const j = jourParis(e.timestamp!);
    const v = jours.get(j) ?? { ecoutes: 0, sec: 0 };
    v.ecoutes++;
    v.sec += sec(e);
    jours.set(j, v);
  }
  const nbJours =
    periode === "tout"
      ? Math.min(
          365,
          Math.max(
            1,
            Math.ceil(
              (Date.now() - new Date(ecoutes.at(-1)?.timestamp ?? Date.now()).getTime()) / 86400000,
            ) + 1,
          ),
        )
      : Number(periode);
  const parJour = Array.from({ length: nbJours }, (_, i) => {
    const j = jourParis(new Date(Date.now() - (nbJours - 1 - i) * 86400000).toISOString());
    return { jour: j, ...(jours.get(j) ?? { ecoutes: 0, sec: 0 }) };
  });

  // Top audios
  const parAudio = new Map<
    string,
    { ecoutes: number; sec: number; ok: number; mesurees: number }
  >();
  for (const e of ecoutes) {
    if (!e.audio_id) continue;
    const v = parAudio.get(e.audio_id) ?? { ecoutes: 0, sec: 0, ok: 0, mesurees: 0 };
    v.ecoutes++;
    v.sec += sec(e);
    if (fiable(e)) {
      v.mesurees++;
      if (estComplete(e)) v.ok++;
    }
    parAudio.set(e.audio_id, v);
  }
  const topAudios = [...parAudio.entries()]
    .sort((a, b) => b[1].sec - a[1].sec)
    .slice(0, 8)
    .map(([id, v]) => ({
      id,
      titre: titres.get(id) ?? "Audio supprimé",
      ecoutes: v.ecoutes,
      minutes: Math.round(v.sec / 6) / 10,
      completes: v.mesurees ? pct(v.ok, v.mesurees) : "non mesuré",
    }));

  const mesurees = ecoutes.filter(fiable);
  const compter = <K extends string>(cles: readonly K[] | null, f: (e: Ecoute) => K) => {
    const m = new Map<K, number>();
    if (cles) for (const k of cles) m.set(k, 0);
    for (const e of ecoutes) m.set(f(e), (m.get(f(e)) ?? 0) + 1);
    return m;
  };
  const parMoment = [...compter(MOMENTS, (e) => momentDe(heureParis(e.timestamp!)))].map(
    ([moment, n]) => ({ moment, ecoutes: n }),
  );
  const parLangue = [...compter(null, (e) => LANGUES[e.langue ?? ""] ?? "Non renseignée")]
    .sort((a, b) => b[1] - a[1])
    .map(([langue, n]) => ({ langue, ecoutes: n }));
  const parVoix = [...compter(null, (e) => VOIX[e.voix ?? ""] ?? "Non renseignée")]
    .sort((a, b) => b[1] - a[1])
    .map(([voix, n]) => ({ voix, ecoutes: n }));

  const recentes = d.recentes.map((e) => ({
    titre: e.audio_id ? (titres.get(e.audio_id) ?? "Audio supprimé") : "Audio inconnu",
    lieu: e.spot_id ? (nomsSpots.get(e.spot_id) ?? "Spot supprimé") : "Bibliothèque",
    langue: (e.langue ?? "?").toUpperCase(),
    duree: fmtDuree(sec(e)),
    quand: e.timestamp ? ilYa(e.timestamp) : "",
  }));

  // Clients B2C
  const ab = d.abonnes;
  const today = new Date().toISOString().slice(0, 10);
  const payants = ab.filter((a) => a.statut === "actif" || a.statut === "paiement_echoue");
  const mensuels = payants.filter((a) => a.formule === "mensuel").length;
  const annuels = payants.filter((a) => a.formule === "annuel").length;
  const compte = (vals: (string | null)[], labels: Record<string, string>) => {
    const m = new Map<string, number>();
    for (const v of vals) {
      const k = labels[v ?? ""] ?? (v || "non renseigné");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  // Inscriptions par semaine : 12 semaines, du lundi 0 h au lundi suivant (heure locale).
  const lundi0h = new Date();
  lundi0h.setHours(0, 0, 0, 0);
  lundi0h.setDate(lundi0h.getDate() - ((lundi0h.getDay() + 6) % 7));
  const parSemaine = Array.from({ length: 12 }, (_, i) => {
    const debut = new Date(lundi0h);
    debut.setDate(debut.getDate() - (11 - i) * 7);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 7);
    return {
      semaine: debut.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      inscriptions: ab.filter(
        (x) => x.created_at && new Date(x.created_at) >= debut && new Date(x.created_at) < fin,
      ).length,
    };
  });
  const biblio = ecoutes.filter((e) => !e.spot_id);

  // Spots
  const lignes = d.spots
    .map((sp) => {
      const es = ecoutes.filter((e) => e.spot_id === sp.id);
      const top = [
        ...es.reduce(
          (m, e) => (e.audio_id ? m.set(e.audio_id, (m.get(e.audio_id) ?? 0) + 1) : m),
          new Map<string, number>(),
        ),
      ].sort((a, b) => b[1] - a[1])[0];
      return {
        id: sp.id,
        nom: sp.nom ?? "Spot sans nom",
        visiteurs: d.acces.filter((a) => a.spot_id === sp.id).length,
        ecoutes: es.length,
        sec: es.reduce((t, e) => t + sec(e), 0),
        abonnes: ab.filter((a) => a.spot_origine_id === sp.id).length,
        top: top ? (titres.get(top[0]) ?? null) : null,
        derniere: es[0]?.timestamp ?? null,
        inactif: sp.statut !== "actif",
        dormant: sp.statut === "actif" && !d.spotsActifs7j.has(sp.id),
      };
    })
    .sort((a, b) => b.ecoutes - a.ecoutes || b.visiteurs - a.visiteurs);
  const topB = [
    ...biblio.reduce(
      (m, e) => (e.audio_id ? m.set(e.audio_id, (m.get(e.audio_id) ?? 0) + 1) : m),
      new Map<string, number>(),
    ),
  ].sort((a, b) => b[1] - a[1])[0];
  lignes.push({
    id: "biblio",
    nom: "Bibliothèque",
    visiteurs: 0,
    ecoutes: biblio.length,
    sec: biblio.reduce((t, e) => t + sec(e), 0),
    abonnes: 0,
    top: topB ? (titres.get(topB[0]) ?? null) : null,
    derniere: biblio[0]?.timestamp ?? null,
    inactif: false,
    dormant: false,
  });

  return {
    nbEcoutes: ecoutes.length,
    totalSec: ecoutes.reduce((t, e) => t + sec(e), 0),
    completes: { ok: mesurees.filter(estComplete).length, total: mesurees.length },
    parJour,
    topAudios,
    parMoment,
    parLangue,
    parVoix,
    recentes,
    b2c: {
      total: ab.length,
      avecAcces: ab.filter((a) =>
        ["actif", "paiement_echoue", "offert", "ambassadeur"].includes(a.statut ?? ""),
      ).length,
      mensuels,
      annuels,
      mrr: mensuels * PRIX_MENSUEL + (annuels * PRIX_ANNUEL) / 12,
      resiliationsProgrammees: ab
        .filter(
          (a) =>
            a.date_fin_prevue && a.date_fin_prevue.slice(0, 10) >= today && a.statut !== "resilie",
        )
        .map((a) => a.date_fin_prevue!)
        .sort(),
      venusDunSpot: ab.filter((a) => a.spot_origine_id).length,
      parraines: ab.filter((a) => a.parrain_id).length,
      statuts: compte(
        ab.map((a) => a.statut),
        STATUT_LABEL,
      ),
      langues: compte(
        ab.map((a) => a.langue_preferee),
        Object.fromEntries(Object.entries(LANGUES).map(([k, v]) => [k, v.toLowerCase()])),
      ),
      parSemaine,
      ecoutesBiblio: biblio.length,
      secBiblio: biblio.reduce((t, e) => t + sec(e), 0),
      topBiblio: topB ? (titres.get(topB[0]) ?? null) : null,
    },
    spots: lignes,
  };
}
