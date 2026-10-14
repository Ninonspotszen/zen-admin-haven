export const BREVO_TEMPLATES = { resiliationFr: 2 } as const;

export async function sendBrevoTemplate(opts: {
  templateId: number;
  toEmail: string;
  toName?: string | null;
  params: Record<string, string | null>;
}): Promise<void> {
  try {
    if (process.env["EMAILS_ACTIFS"] !== "true") {
      console.info("brevo: envoi désactivé (EMAILS_ACTIFS)", opts.templateId);
      return;
    }
    const key = process.env["BREVO_API_KEY"];
    if (!key) {
      console.warn("brevo: BREVO_API_KEY manquante");
      return;
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
    if (!res.ok) console.error("brevo:", res.status, await res.text());
  } catch (e) {
    console.error("brevo:", (e as Error).message);
  }
}
