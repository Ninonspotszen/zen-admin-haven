export const BREVO_TEMPLATES = { resiliationFr: 2, bienvenueFr: 4, accesOffertFr: 5 } as const;

/**
 * Modèles Brevo par email et par langue (tous créés INACTIFS, à activer par Ninon).
 * Une langue absente retombe sur le français : on n'envoie jamais un email vide.
 * Pour ajouter une traduction : créer le modèle dans Brevo, puis ajouter son numéro ici.
 */
export const LANGUES = ["fr", "en", "de", "nl", "es"] as const;
export type Langue = (typeof LANGUES)[number];
export const MODELES = {
  bienvenue: { fr: 4 },
  resiliation: { fr: 2 },
  accesOffert: { fr: 5 },
  accuseB2b: { fr: 6 },
  accesJ7: { fr: 7 },
  accesFin: { fr: 8 },
  accueilJ3: { fr: 9 },
  relanceInactif: { fr: 10 },
  rappelAnnuel: { fr: 11 },
  visiteurSpot: { fr: 12 },
} as const satisfies Record<string, Partial<Record<Langue, number>> & { fr: number }>;
export type Modele = keyof typeof MODELES;

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
export type ListeBrevo = "ABONNES" | "NEWSLETTER" | "PROSPECTS_B2B" | "VISITEURS_SPOTS" | "ACCES_OFFERTS";
export async function syncBrevoContact(opts: {
  email: string;
  prenom?: string | null | undefined;
  nom?: string | null | undefined;
  extId?: string | null | undefined;
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
