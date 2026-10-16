/**
 * Robot quotidien des emails du cycle de vie (appelé chaque matin par Vercel Cron).
 *
 * Il ne fait que regarder les dates en base et envoyer, une seule fois, le bon email :
 *   - accès offert : J-7 avant la fin, puis le lendemain de la fin (invitation à s'abonner) ;
 *   - accueil J+3 après l'inscription ;
 *   - relance après 14 jours sans connexion (une fois par période d'absence) ;
 *   - abonnement annuel : information de reconduction 31 à 45 jours avant (Code de la consommation, L.215-1) ;
 *   - résumé du matin pour Ninon (accès qui se terminent, demandes B2B à relancer, pilotes, échecs).
 *
 * Garde-fous :
 *   - EMAILS_ACTIFS ≠ "true" → mode simulation : rien n'est envoyé ni enregistré, la liste
 *     de ce qui PARTIRAIT est seulement renvoyée (pratique pour tester avant le lancement) ;
 *   - chaque envoi a une clé unique dans emails_automatiques : jamais deux fois le même email ;
 *   - les comptes créés avant DEBUT_TUNNEL (tests) ne reçoivent ni accueil ni relance.
 */
import type { EmailStatus, Langue } from "@/lib/brevo.server";

const DEBUT_TUNNEL = "2026-10-19T00:00:00+02:00"; // lancement public
const JOURS_INACTIVITE = 14;

type Abonne = {
  id: string;
  email: string;
  prenom: string | null;
  statut: string | null;
  formule: string | null;
  created_at: string | null;
  date_fin_acces: string | null;
  date_fin_prevue: string | null;
  date_renouvellement: string | null;
  langue_preferee: string | null;
  derniere_connexion: string | null;
  emails_stop: boolean | null;
};

export type EnvoiPrevu = { type: string; email: string; detail: string; statut?: EmailStatus | "deja_envoye" };

const jourParis = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
const plusJours = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function lancerRobotQuotidien(opts: { simulationForcee?: boolean } = {}) {
  const simulation = opts.simulationForcee === true || process.env["EMAILS_ACTIFS"] !== "true";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendBrevoTemplate, sendBrevoInternalAlert, modele, dateLangue, prixLangue } = await import("@/lib/brevo.server");
  const { dateFr } = await import("@/lib/date-fr");
  // Colonnes récentes, absentes des types générés.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  const aujourdHui = jourParis();
  const maintenant = Date.now();
  const envois: EnvoiPrevu[] = [];

  const { data: abonnesData, error } = await db
    .from("abonnes_b2c")
    .select("id, email, prenom, statut, formule, created_at, date_fin_acces, date_fin_prevue, date_renouvellement, langue_preferee, derniere_connexion, emails_stop")
    .limit(5000);
  if (error) throw new Error(`lecture abonnes_b2c : ${error.message}`);
  const abonnes = (abonnesData ?? []) as Abonne[];

  /** Envoie un modèle une seule fois pour une clé donnée (ou le simule). */
  async function uneFois(
    type: string,
    cle: string,
    a: Abonne,
    nom: Parameters<typeof modele>[0],
    params: (l: Langue) => Record<string, string | null>,
    detail: string,
  ) {
    if (!a.email) return;
    if (a.emails_stop && STOPPABLES.has(type)) return;
    const { templateId, langue } = modele(nom, a.langue_preferee);
    if (simulation) {
      const { data: deja } = await db.from("emails_automatiques").select("id").eq("cle", cle).maybeSingle();
      envois.push({ type, email: a.email, detail, ...(deja ? { statut: "deja_envoye" as const } : {}) });
      return;
    }
    const { data: ligne, error: insErr } = await db
      .from("emails_automatiques")
      .insert({ type, cle, destinataire: a.email, abonne_id: a.id, langue, detail })
      .select("id")
      .single();
    if (insErr) {
      if (insErr.code === "23505") return; // déjà envoyé : la clé existe
      console.error("robot: journal impossible", insErr.message);
      return; // sans trace, on n'envoie pas (sinon risque de doublon demain)
    }
    const statut = await sendBrevoTemplate({ templateId, toEmail: a.email, toName: a.prenom, params: params(langue) });
    await db.from("emails_automatiques").update({ statut }).eq("id", ligne.id);
    envois.push({ type, email: a.email, detail, statut });
  }

  const prenom = (a: Abonne) => a.prenom?.trim() || null;
  const offertValide = (a: Abonne) => (a.statut === "offert" || a.statut === "ambassadeur") && !!a.date_fin_acces;

  // Emails d'accompagnement : non envoyés à qui a répondu « STOP ». Le rappel annuel (obligation légale) part toujours.
  const STOPPABLES = new Set(["acces_j7", "acces_fin", "accueil_j3", "relance_inactif"]);

  for (const a of abonnes) {
    // 1. Accès offert : J-7
    if (offertValide(a) && a.date_fin_acces === plusJours(aujourdHui, 7)) {
      await uneFois("acces_j7", `acces_j7:${a.id}:${a.date_fin_acces}`, a, "accesJ7",
        (l) => ({ PRENOM: prenom(a), DATE_FIN: dateLangue(a.date_fin_acces!, l) }), `fin d'accès le ${a.date_fin_acces}`);
    }
    // 2. Accès offert terminé (rattrapage sur 3 jours si le robot n'est pas passé)
    if (offertValide(a) && a.date_fin_acces! < aujourdHui && a.date_fin_acces! >= plusJours(aujourdHui, -3)) {
      await uneFois("acces_fin", `acces_fin:${a.id}:${a.date_fin_acces}`, a, "accesFin",
        (l) => ({ PRENOM: prenom(a), DATE_FIN: dateLangue(a.date_fin_acces!, l), EMAIL: a.email }), `accès terminé le ${a.date_fin_acces}`);
    }

    const accesEnCours =
      a.statut === "actif" || ((a.statut === "offert" || a.statut === "ambassadeur") && (a.date_fin_acces ?? "") >= aujourdHui);
    const cree = a.created_at ? Date.parse(a.created_at) : NaN;
    const apresLancement = cree >= Date.parse(DEBUT_TUNNEL);

    // 3. Accueil J+3 (fenêtre de 2 jours pour rattraper un passage manqué)
    if (accesEnCours && apresLancement && maintenant - cree >= 3 * 864e5 && maintenant - cree < 5 * 864e5) {
      await uneFois("accueil_j3", `accueil_j3:${a.id}`, a, "accueilJ3", () => ({ PRENOM: prenom(a) }), "inscrit il y a 3 jours");
    }

    // 4. Relance après 14 jours sans connexion (pas pendant un préavis de résiliation, pas à moins de 3 jours d'une fin d'accès)
    const finProche = a.statut !== "actif" && (a.date_fin_acces ?? "") < plusJours(aujourdHui, 3);
    if (accesEnCours && !a.date_fin_prevue && !finProche && !Number.isNaN(cree)) {
      const derniere = Math.max(a.derniere_connexion ? Date.parse(a.derniere_connexion) : cree, Date.parse(DEBUT_TUNNEL));
      if (maintenant - derniere >= JOURS_INACTIVITE * 864e5) {
        const repere = new Date(derniere).toISOString().slice(0, 10);
        await uneFois("relance_inactif", `relance_inactif:${a.id}:${repere}`, a, "relanceInactif",
          () => ({ PRENOM: prenom(a), PAYANT: a.statut === "actif" ? "oui" : null }), `sans connexion depuis le ${repere}`);
      }
    }

    // 5. Abonnement annuel : information de reconduction (L.215-1 : entre 3 mois et 1 mois avant)
    if (
      a.statut === "actif" && a.formule === "annuel" && !a.date_fin_prevue && a.date_renouvellement &&
      a.date_renouvellement >= plusJours(aujourdHui, 31) && a.date_renouvellement <= plusJours(aujourdHui, 45) &&
      // la première échéance d'un annuel avec mois d'essai n'est pas une reconduction annuelle
      !Number.isNaN(cree) && Date.parse(a.date_renouvellement) - cree > 300 * 864e5
    ) {
      await uneFois("rappel_annuel", `rappel_annuel:${a.id}:${a.date_renouvellement}`, a, "rappelAnnuel", (l) => ({
        PRENOM: prenom(a),
        DATE_RENOUVELLEMENT: dateLangue(a.date_renouvellement!, l),
        DATE_LIMITE: dateLangue(plusJours(a.date_renouvellement!, -1), l),
        MONTANT: prixLangue(Number(process.env["PRIX_ANNUEL_EUROS"] || 49), l),
      }), `renouvellement le ${a.date_renouvellement}`);
    }
  }

  // Ménage : les compteurs anti-abus de plus de 2 jours ne servent plus.
  if (!simulation) await db.from("limites_tentatives").delete().lt("created_at", new Date(maintenant - 2 * 864e5).toISOString());

  // 6. Résumé du matin pour Ninon -------------------------------------------------------
  const blocs: string[] = [];
  const liste = (titre: string, lignes: string[]) =>
    lignes.length ? blocs.push(`<h3 style="margin:20px 0 6px;font-size:15px">${esc(titre)} (${lignes.length})</h3><ul style="margin:0;padding-left:18px">${lignes.map((l) => `<li>${l}</li>`).join("")}</ul>`) : 0;

  liste("Accès offerts qui se terminent dans les 7 jours", abonnes
    .filter((a) => offertValide(a) && a.date_fin_acces! >= aujourdHui && a.date_fin_acces! <= plusJours(aujourdHui, 7))
    .map((a) => `${esc(a.prenom ?? "")} ${esc(a.email)} · fin le ${dateFr(a.date_fin_acces!)}`));
  liste("Paiements en échec", abonnes.filter((a) => a.statut === "paiement_echoue").map((a) => esc(a.email)));

  const { data: demandes } = await db
    .from("contact_requests")
    .select("created_at, etablissement, nom, email, statut, prochaine_action")
    .not("statut", "in", "(client,perdue,traitee)")
    .limit(200);
  liste("Demandes B2B à relancer", ((demandes ?? []) as { created_at: string; etablissement: string | null; nom: string | null; email: string | null; statut: string; prochaine_action: string | null }[])
    .filter((d) => (d.prochaine_action && d.prochaine_action <= aujourdHui) || (d.statut === "nouvelle" && maintenant - Date.parse(d.created_at) > 2 * 864e5))
    .map((d) => `${esc(d.etablissement || d.nom || d.email || "Sans nom")} · ${d.prochaine_action ? `action prévue le ${dateFr(d.prochaine_action)}` : "nouvelle depuis plus de 2 jours"}`));

  const { data: clients } = await db.from("clients").select("nom, date_pilote_fin, date_renouvellement, statut").limit(500);
  liste("Clients B2B : pilote qui se termine ou renouvellement proche", ((clients ?? []) as { nom: string; date_pilote_fin: string | null; date_renouvellement: string | null }[])
    .flatMap((c) => [
      c.date_pilote_fin && c.date_pilote_fin >= aujourdHui && c.date_pilote_fin <= plusJours(aujourdHui, 14) ? `${esc(c.nom)} · fin du pilote le ${dateFr(c.date_pilote_fin)}` : null,
      c.date_renouvellement && c.date_renouvellement >= aujourdHui && c.date_renouvellement <= plusJours(aujourdHui, 30) ? `${esc(c.nom)} · renouvellement le ${dateFr(c.date_renouvellement)}` : null,
    ])
    .filter((x): x is string => !!x));

  const { data: echecs } = await db
    .from("emails_automatiques")
    .select("type, destinataire")
    .eq("statut", "failed")
    .gte("created_at", new Date(maintenant - 864e5).toISOString());
  liste("Emails automatiques en échec (24 h)", ((echecs ?? []) as { type: string; destinataire: string }[]).map((e) => `${esc(e.type)} · ${esc(e.destinataire)}`));

  liste(simulation ? "Emails qui partiraient aujourd'hui (simulation, rien n'est envoyé)" : "Emails envoyés ce matin",
    envois.filter((e) => e.statut !== "deja_envoye").map((e) => `${esc(e.type)} · ${esc(e.email)} · ${esc(e.detail)}${e.statut ? ` · ${e.statut}` : ""}`));

  let resume: EmailStatus | "rien_a_signaler" | "deja_envoye" | "test_sans_envoi" = "rien_a_signaler";
  if (blocs.length && opts.simulationForcee) resume = "test_sans_envoi"; // test manuel : on ne consomme pas le résumé du jour
  else if (blocs.length) {
    const cle = `resume:${aujourdHui}`;
    const { error: dejaErr } = await db.from("emails_automatiques").insert({ type: "resume", cle, destinataire: "bonjour@spotszen.fr", detail: `${blocs.length} rubriques` });
    if (dejaErr?.code === "23505") resume = "deja_envoye";
    else {
      resume = await sendBrevoInternalAlert({
        interrupteur: "NOTIF_RESUME_ACTIVE",
        subject: `Spots Zen · votre point du ${dateFr(aujourdHui)}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:21px;color:#1c2e1e"><p>Bonjour Ninon, voici ce qui demande votre attention aujourd'hui.</p>${blocs.join("")}<p style="margin-top:20px;color:#6b6b6b">Détail dans l'admin : onglets « Abonnés », « Demandes » et « Emails ».</p></div>`,
      });
      await db.from("emails_automatiques").update({ statut: resume }).eq("cle", cle);
    }
  }

  return { jour: aujourdHui, simulation, envois, resume, rubriques: blocs.length };
}
