import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({
    meta: [
      { title: "Emails automatiques — Spots Zen Admin" },
      { name: "description", content: "Journal des emails du cycle de vie et visiteurs des spots." },
    ],
  }),
  component: EmailsPage,
});

const TYPE: Record<string, string> = {
  acces_j7: "Accès offert · J-7",
  acces_fin: "Accès offert · terminé",
  accueil_j3: "Accueil J+3",
  relance_inactif: "Relance 14 jours",
  rappel_annuel: "Rappel annuel (L.215-1)",
  resume: "Résumé du matin (pour vous)",
};
const STATUT: Record<string, { label: string; cls: string }> = {
  sent: { label: "Envoyé", cls: "bg-green-100 text-green-800" },
  disabled: { label: "Désactivé", cls: "bg-zinc-100 text-zinc-600" },
  failed: { label: "Échec", cls: "bg-red-100 text-red-800" },
  en_cours: { label: "En cours", cls: "bg-amber-100 text-amber-800" },
};
const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

// Tables récentes, absentes des types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function EmailsPage() {
  const envois = useQuery({
    queryKey: ["emails_automatiques"],
    queryFn: async () => {
      const { data, error } = await db
        .from("emails_automatiques")
        .select("id, created_at, type, destinataire, langue, statut, detail")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as { id: string; created_at: string; type: string; destinataire: string; langue: string | null; statut: string; detail: string | null }[];
    },
  });
  const visiteurs = useQuery({
    queryKey: ["spot_leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("spot_leads")
        .select("id, created_at, email, langue, newsletter_ok, email_statut, spots(nom)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as { id: string; created_at: string; email: string; langue: string | null; newsletter_ok: boolean; email_statut: string | null; spots: { nom: string | null } | null }[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-serif text-3xl text-foreground">Emails automatiques</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Envoyés chaque matin par le robot quotidien, une seule fois par personne et par occasion. Tant que l'interrupteur
        EMAILS_ACTIFS n'est pas à « true » dans Vercel, rien ne part et ce journal reste vide.
      </p>

      <section className="mt-8 rounded-2xl border bg-card">
        <h2 className="border-b px-6 py-4 font-serif text-xl text-foreground">Journal des envois</h2>
        {envois.error ? (
          <p role="alert" className="p-6 text-sm text-destructive">Journal indisponible ({(envois.error as Error).message}). La migration SQL du 16/10 a-t-elle été exécutée ?</p>
        ) : envois.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
        ) : !envois.data?.length ? (
          <p className="p-6 text-sm text-muted-foreground">Aucun email automatique envoyé pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Destinataire</th><th className="px-6 py-3">Langue</th><th className="px-6 py-3">Statut</th></tr>
              </thead>
              <tbody>
                {envois.data.map((e) => {
                  const st = STATUT[e.statut] ?? { label: e.statut, cls: "bg-zinc-100 text-zinc-600" };
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{fmt(e.created_at)}</td>
                      <td className="px-6 py-3">{TYPE[e.type] ?? e.type}{e.detail && <span className="block text-xs text-muted-foreground">{e.detail}</span>}</td>
                      <td className="px-6 py-3">{e.destinataire}</td>
                      <td className="px-6 py-3 uppercase text-muted-foreground">{e.langue ?? "—"}</td>
                      <td className="px-6 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border bg-card">
        <h2 className="border-b px-6 py-4 font-serif text-xl text-foreground">Visiteurs des spots</h2>
        <p className="px-6 pt-4 text-sm text-muted-foreground">
          Personnes qui ont demandé, depuis un QR code, le lien pour continuer chez elles. Seules celles qui ont coché la case
          rejoignent la liste newsletter.
        </p>
        {visiteurs.error ? (
          <p role="alert" className="p-6 text-sm text-destructive">Liste indisponible ({(visiteurs.error as Error).message}).</p>
        ) : visiteurs.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
        ) : !visiteurs.data?.length ? (
          <p className="p-6 text-sm text-muted-foreground">Aucun visiteur pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Spot</th><th className="px-6 py-3">Newsletter</th><th className="px-6 py-3">Lien envoyé</th></tr>
              </thead>
              <tbody>
                {visiteurs.data.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{fmt(v.created_at)}</td>
                    <td className="px-6 py-3">{v.email}</td>
                    <td className="px-6 py-3">{v.spots?.nom ?? "—"}</td>
                    <td className="px-6 py-3">{v.newsletter_ok ? "Oui" : "Non"}</td>
                    <td className="px-6 py-3">{STATUT[v.email_statut ?? ""]?.label ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
