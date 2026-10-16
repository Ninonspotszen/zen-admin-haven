/**
 * Modèles Brevo par email et par langue (tous créés INACTIFS, à activer par Ninon).
 * Une langue absente retombe sur le français : on n'envoie jamais un email vide.
 * Pour ajouter une traduction : créer le modèle dans Brevo, puis ajouter son numéro ici.
 */
export const LANGUES = ["fr", "en", "de", "nl", "es"] as const;
export type Langue = (typeof LANGUES)[number];
export const MODELES = {
  bienvenue: { fr: 4, en: 21, de: 22, nl: 23, es: 24 },
  resiliation: { fr: 2, en: 17, de: 18, nl: 19, es: 20 },
  accesOffert: { fr: 5, en: 25, de: 26, nl: 27, es: 28 },
  accuseB2b: { fr: 6, en: 29, de: 30, nl: 31, es: 32 },
  accesJ7: { fr: 13, en: 33, de: 34, nl: 35, es: 36 },
  accesFin: { fr: 14, en: 37, de: 38, nl: 39, es: 40 },
  accueilJ3: { fr: 15, en: 41, de: 42, nl: 43, es: 44 },
  relanceInactif: { fr: 16, en: 45, de: 46, nl: 47, es: 48 },
  rappelAnnuel: { fr: 11, en: 49, de: 50, nl: 51, es: 52 },
  visiteurSpot: { fr: 12, en: 53, de: 54, nl: 55, es: 56 },
} as const satisfies Record<string, Partial<Record<Langue, number>> & { fr: number }>;
export type Modele = keyof typeof MODELES;

/** "2026-11-14" → date écrite dans la langue de l'email (« 14 novembre 2026 », « 14 November 2026 »…). */
const LOCALES: Record<Langue, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", nl: "nl-NL", es: "es-ES" };
export function dateLangue(iso: string, langue: Langue): string {
  return new Intl.DateTimeFormat(LOCALES[langue], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}
/** Montant affiché dans la langue de l'email (49 € / €49). */
export function prixLangue(euros: number, langue: Langue): string {
  return new Intl.NumberFormat(LOCALES[langue], { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(euros);
}

export function modele(nom: Modele, langue?: string | null): { templateId: number; langue: Langue } {
  const l = (LANGUES as readonly string[]).includes(langue ?? "") ? (langue as Langue) : "fr";
  const id = (MODELES[nom] as Partial<Record<Langue, number>>)[l];
  return id ? { templateId: id, langue: l } : { templateId: MODELES[nom].fr, langue: "fr" };
}

/** Résultat d'un envoi : envoyé, désactivé (avant lancement) ou en échec. */
export type EmailStatus = "sent" | "disabled" | "failed";

/**
 * Envoie un modèle Brevo transactionnel. Ne lève jamais d'erreur (un email raté ne doit
 * pas faire échouer l'action en cours) mais renvoie le résultat pour pouvoir l'afficher.
 */
export async function sendBrevoTemplate(opts: {
  templateId: number;
  toEmail: string;
  toName?: string | null;
  params: Record<string, string | null>;
}): Promise<EmailStatus> {
  try {
    if (process.env["EMAILS_ACTIFS"] !== "true") {
      console.info("brevo: envoi désactivé (EMAILS_ACTIFS)", opts.templateId);
      return "disabled";
    }
    const key = process.env["BREVO_API_KEY"];
    if (!key) {
      console.warn("brevo: BREVO_API_KEY manquante");
      return "failed";
    }
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.params)) if (v !== null) params[k] = v;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        templateId: opts.templateId,
        to: [{ email: opts.toEmail, name: opts.toName ?? undefined }],
        params,
      }),
    });
    if (!res.ok) {
      console.error("brevo:", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("brevo:", (e as Error).message);
    return "failed";
  }
}

/**
 * Email interne envoyé à Spots Zen (jamais à un client) : alerte « nouvelle demande de contact ».
 * Interrupteur dédié NOTIF_CONTACT_ACTIVE (indépendant d'EMAILS_ACTIFS, qui ne concerne que les clients).
 * Ne lève jamais d'erreur.
 */
export async function sendBrevoInternalAlert(opts: {
  subject: string;
  html: string;
  replyTo?: { email: string; name?: string | null } | null;
  /** Interrupteur Vercel qui autorise cette alerte (par défaut celui du formulaire de contact). */
  interrupteur?: "NOTIF_CONTACT_ACTIVE" | "NOTIF_ABONNES_ACTIVE" | "NOTIF_RESUME_ACTIVE";
}): Promise<EmailStatus> {
  try {
    const interrupteur = opts.interrupteur ?? "NOTIF_CONTACT_ACTIVE";
    if (process.env[interrupteur] !== "true") {
      console.info(`brevo: alerte interne désactivée (${interrupteur})`);
      return "disabled";
    }
    const key = process.env["BREVO_API_KEY"];
    if (!key) {
      console.warn("brevo: BREVO_API_KEY manquante");
      return "failed";
    }
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: "bonjour@spotszen.fr", name: "Site Spots Zen" },
        to: [{ email: "bonjour@spotszen.fr", name: "Spots Zen" }],
        ...(opts.replyTo ? { replyTo: { email: opts.replyTo.email, name: opts.replyTo.name ?? undefined } } : {}),
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("brevo (alerte interne):", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("brevo (alerte interne):", (e as Error).message);
    return "failed";
  }
}

/**
 * Synchronise un contact dans le CRM Brevo (création ou mise à jour) et l'ajoute aux listes données.
 * Interrupteur dédié BREVO_SYNC_ACTIF. Les numéros de listes viennent des variables Vercel
 * BREVO_LISTE_* (une liste absente est simplement ignorée). Ne lève jamais d'erreur.
 * Aucun email n'est envoyé par cette fonction : elle range seulement le contact.
 */
export type ListeBrevo = "ABONNES" | "NEWSLETTER" | "PROSPECTS_B2B" | "VISITEURS_SPOTS" | "ACCES_OFFERTS" | "ACTUALITES_PRO";
export async function syncBrevoContact(opts: {
  email: string;
  prenom?: string | null | undefined;
  nom?: string | null | undefined;
  extId?: string | null | undefined;
  /** Langue du contact (attribut Brevo LANGUE, à créer dans Brevo puis BREVO_ATTRIBUT_LANGUE=true). */
  langue?: string | null | undefined;
  listes?: ListeBrevo[];
  retirerDe?: ListeBrevo[];
}): Promise<"synced" | "disabled" | "failed"> {
  try {
    if (process.env["BREVO_SYNC_ACTIF"] !== "true") return "disabled";
    const key = process.env["BREVO_API_KEY"];
    if (!key) return "failed";
    const ids = (ls?: ListeBrevo[]) =>
      (ls ?? []).map((l) => Number(process.env[`BREVO_LISTE_${l}`])).filter((n) => Number.isInteger(n) && n > 0);
    const attributes: Record<string, string> = {};
    if (opts.prenom?.trim()) attributes["PRENOM"] = opts.prenom.trim();
    if (opts.nom?.trim()) attributes["NOM"] = opts.nom.trim();
    if (opts.extId) attributes["EXT_ID"] = opts.extId;
    if (opts.langue && process.env["BREVO_ATTRIBUT_LANGUE"] === "true") attributes["LANGUE"] = opts.langue;
    const headers = { "api-key": key, "content-type": "application/json", accept: "application/json" };
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: opts.email, attributes, listIds: ids(opts.listes), updateEnabled: true }),
    });
    if (!res.ok) {
      console.error("brevo (contact):", res.status, await res.text());
      return "failed";
    }
    for (const listId of ids(opts.retirerDe)) {
      await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`, {
        method: "POST",
        headers,
        body: JSON.stringify({ emails: [opts.email] }),
      });
    }
    return "synced";
  } catch (e) {
    console.error("brevo (contact):", (e as Error).message);
    return "failed";
  }
}
