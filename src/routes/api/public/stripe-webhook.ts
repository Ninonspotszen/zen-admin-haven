import { createFileRoute } from "@tanstack/react-router";
import { dateFr } from "@/lib/date-fr";

const PRICE_TO_FORMULE: Record<string, string> = {
  price_1UOHEe12YS5PWilJvjiRsLhe: "mensuel",
  price_1UOHEi12YS5PWilJT8KiDnlI: "annuel",
};

const TOLERANCE_SEC = 300;

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Vérification de signature Stripe (HMAC-SHA256 de "timestamp.payload").
async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SEC) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => timingSafeEqual(s, expected));
}

const toDate = (ts?: number | null) => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null);
const idOf = (v: unknown): string | null =>
  typeof v === "string" ? v : (v as { id?: string } | null)?.id ?? null;

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const signature = request.headers.get("stripe-signature");
        if (!secret || !signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        if (!(await verifyStripeSignature(body, signature, secret))) {
          return new Response("Invalid signature", { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = JSON.parse(body) as { type: string; data: { object: any } };
        const obj = event.data.object;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Colonnes ajoutées récemment : client non typé pour cette table.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const abonnes = () => (supabaseAdmin as any).from("abonnes_b2c");

        try {
          if (event.type === "checkout.session.completed") {
            let userId: string | null = obj.client_reference_id ?? null;
            const subscriptionId = idOf(obj.subscription);
            const email: string | null = obj.customer_details?.email ?? obj.customer_email ?? null;
            if ((userId || email) && subscriptionId) {
              let priceId = "";
              let periodEnd: number | null = null;
              let trialEnd: number | null = null;
              const stripeKey = process.env["STRIPE_SECRET_KEY"];
              if (stripeKey) {
                const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
                  headers: { Authorization: `Bearer ${stripeKey}` },
                });
                if (res.ok) {
                  const sub = await res.json();
                  const item = sub.items?.data?.[0];
                  priceId = item?.price?.id ?? "";
                  periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
                  trialEnd = sub.status === "trialing" ? sub.trial_end ?? null : null;
                }
              }

              // Paiement via les liens /particuliers : pas de client_reference_id.
              // On rattache l'abonnement à l'email Stripe : mise à jour si le compte
              // existe, sinon création du compte auth + ligne abonnes_b2c.
              if (!userId && email) {
                const { data: byEmail } = await abonnes().select("id").eq("email", email).maybeSingle();
                if (byEmail?.id) {
                  userId = byEmail.id;
                } else {
                  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    email_confirm: true,
                  });
                  if (createErr) throw createErr;
                  userId = created.user?.id ?? null;
                }
              }
              if (!userId) throw new Error("Aucun utilisateur résolu pour cette session Checkout");

              // Spot d'origine : UUID valide ET spot existant ; ne fait jamais échouer le webhook.
              let spotOrigine: string | null = null;
              const rawSpot = obj.metadata?.spot_origine_id;
              if (typeof rawSpot === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSpot)) {
                try {
                  const { data: sp, error: spErr } = await supabaseAdmin.from("spots").select("id").eq("id", rawSpot).maybeSingle();
                  if (!spErr && sp?.id) spotOrigine = sp.id;
                } catch { spotOrigine = null; }
              }

              const row: Record<string, unknown> = {
                id: userId,
                user_id: userId,
                stripe_customer_id: idOf(obj.customer),
                stripe_subscription_id: subscriptionId,
                formule: PRICE_TO_FORMULE[priceId] ?? null,
                statut: "actif",
                date_renouvellement: toDate(periodEnd),
              };
              if (email) row["email"] = email;

              const { data: existing } = await abonnes()
                .select("id, spot_origine_id, stripe_subscription_id, prenom, langue_preferee")
                .eq("id", userId)
                .maybeSingle();
              // Email de bienvenue : une seule fois par abonnement (Stripe peut renvoyer l'événement).
              const nouvelAbonnement = existing?.stripe_subscription_id !== subscriptionId;
              if (existing) {
                if (!existing.spot_origine_id && spotOrigine) row["spot_origine_id"] = spotOrigine;
                const { error } = await abonnes().update(row).eq("id", userId);
                if (error) throw error;
              } else {
                if (!row["email"]) {
                  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
                  row["email"] = u?.user?.email ?? "";
                }
                if (spotOrigine) row["spot_origine_id"] = spotOrigine;
                const { error } = await abonnes().insert(row);
                if (error) throw error;
              }

              const destinataire = (row["email"] as string | undefined) || null;
              if (nouvelAbonnement && destinataire) {
                const finEssai = toDate(trialEnd);
                const { sendBrevoTemplate, sendBrevoInternalAlert, syncBrevoContact, modele, dateLangue } = await import("@/lib/brevo.server");
                const bienvenue = modele("bienvenue", existing?.langue_preferee);
                await sendBrevoTemplate({
                  templateId: bienvenue.templateId,
                  toEmail: destinataire,
                  toName: existing?.prenom ?? null,
                  params: {
                    PRENOM: existing?.prenom?.trim() || null,
                    // Absent si pas d'essai : le paragraphe « premier mois offert » est alors masqué.
                    DATE_FIN_ESSAI: finEssai ? dateLangue(finEssai, bienvenue.langue) : null,
                  },
                });
                // Alerte pour Ninon + rangement dans la liste Brevo « Abonnés ».
                await sendBrevoInternalAlert({
                  interrupteur: "NOTIF_ABONNES_ACTIVE",
                  subject: `Nouvel abonné · ${row["formule"] ?? "formule inconnue"}${finEssai ? " · essai" : ""}`,
                  html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1c2e1e"><p>Nouvel abonnement : <b>${escHtml(destinataire)}</b> (${String(row["formule"] ?? "?")}).</p>${finEssai ? `<p>Fin de l'essai gratuit le ${dateFr(finEssai)}.</p>` : ""}${spotOrigine ? "<p>Venu d'un spot partenaire.</p>" : ""}<p style="color:#6b6b6b">Fiche dans l'admin, onglet « Abonnés ».</p></div>`,
                });
                await syncBrevoContact({ email: destinataire, prenom: existing?.prenom, extId: userId, langue: bienvenue.langue, listes: ["ABONNES"], retirerDe: ["ACCES_OFFERTS"] });
              }
            }
          } else if (event.type === "invoice.payment_failed") {
            const subId = idOf(obj.subscription) ?? obj.parent?.subscription_details?.subscription ?? null;
            if (subId) {
              const { data: avant } = await abonnes().select("email, statut").eq("stripe_subscription_id", subId).maybeSingle();
              const { error } = await abonnes().update({ statut: "paiement_echoue" }).eq("stripe_subscription_id", subId);
              if (error) throw error;
              if (avant?.email && avant.statut !== "paiement_echoue") {
                // Stripe écrit lui-même au client (relances de paiement) ; ici on prévient seulement Ninon.
                const { sendBrevoInternalAlert } = await import("@/lib/brevo.server");
                await sendBrevoInternalAlert({
                  interrupteur: "NOTIF_ABONNES_ACTIVE",
                  subject: "Paiement en échec",
                  html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1c2e1e"><p>Le paiement de <b>${escHtml(avant.email)}</b> a échoué. Stripe relance automatiquement la personne ; l'accès reste ouvert pendant ce temps.</p></div>`,
                });
              }
            }
          } else if (event.type === "customer.subscription.deleted") {
            const { data: avant } = await abonnes().select("email").eq("stripe_subscription_id", obj.id).maybeSingle();
            const { error } = await abonnes().update({ statut: "resilie", date_fin_prevue: null }).eq("stripe_subscription_id", obj.id);
            if (error) throw error;
            if (avant?.email) {
              const { syncBrevoContact } = await import("@/lib/brevo.server");
              await syncBrevoContact({ email: avant.email, retirerDe: ["ABONNES"] });
            }
          } else if (event.type === "customer.subscription.updated") {
            const subId: string = obj.id;
            const { data: row } = await abonnes().select("id, statut, date_fin_prevue, email, prenom, langue_preferee").eq("stripe_subscription_id", subId).maybeSingle();
            if (row) {
              const periodEnd: number | null = obj.items?.data?.[0]?.current_period_end ?? obj.current_period_end ?? null;
              const priceId: string | undefined = obj.items?.data?.[0]?.price?.id;
              let statut: string | null = null;
              if (obj.status === "active" || obj.status === "trialing") statut = "actif";
              else if (obj.status === "past_due") statut = "paiement_echoue";
              else if (["canceled", "unpaid", "incomplete_expired"].includes(obj.status)) statut = "resilie";
              const finalStatut = row.statut === "resilie" ? "resilie" : statut ?? row.statut;
              const upd: Record<string, unknown> = {};
              if (row.statut !== "resilie" && statut) upd["statut"] = statut;
              upd["date_fin_prevue"] = (obj.cancel_at_period_end === true || obj.cancel_at) && finalStatut !== "resilie"
                ? toDate(obj.cancel_at ?? periodEnd)
                : null;
              if (periodEnd) upd["date_renouvellement"] = toDate(periodEnd);
              if (priceId && PRICE_TO_FORMULE[priceId]) upd["formule"] = PRICE_TO_FORMULE[priceId];
              const { error } = await abonnes().update(upd).eq("stripe_subscription_id", subId);
              if (error) throw error;
              const newFin = upd["date_fin_prevue"] as string | null;
              if (!row.date_fin_prevue && newFin && row.email) {
                const dateFin = dateFr(newFin);
                const { sendBrevoTemplate, sendBrevoInternalAlert, modele, dateLangue } = await import("@/lib/brevo.server");
                const resil = modele("resiliation", row.langue_preferee);
                await sendBrevoTemplate({
                  templateId: resil.templateId,
                  toEmail: row.email,
                  toName: row.prenom,
                  params: { PRENOM: row.prenom?.trim() || null, DATE_FIN: dateLangue(newFin, resil.langue) },
                });
                await sendBrevoInternalAlert({
                  interrupteur: "NOTIF_ABONNES_ACTIVE",
                  subject: "Résiliation programmée",
                  html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1c2e1e"><p><b>${escHtml(row.email)}</b> a résilié son abonnement. Accès jusqu'au ${dateFin}.</p><p style="color:#6b6b6b">Un petit mot personnel peut parfois faire revenir quelqu'un : répondez depuis votre boîte.</p></div>`,
                });
              }
            }
          }
        } catch (e) {
          console.error("stripe-webhook", event.type, (e as Error).message);
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
