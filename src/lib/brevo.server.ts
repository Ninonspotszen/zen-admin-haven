export const BREVO_TEMPLATES = { resiliationFr: 2, bienvenueFr: 4, accesOffertFr: 5 } as const;

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
