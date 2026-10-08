import { createFileRoute } from "@tanstack/react-router";

const PRICE_TO_FORMULE: Record<string, string> = {
  price_1UOH090tGinx8r1X86ru9g6N: "mensuel",
  price_1UOH1g0tGinx8r1XblCvDInd: "annuel",
};

const TOLERANCE_SEC = 300;

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
            const userId: string | null = obj.client_reference_id ?? null;
            const subscriptionId = idOf(obj.subscription);
            if (userId && subscriptionId) {
              let priceId = "";
              let periodEnd: number | null = null;
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
                }
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
              const email = obj.customer_details?.email ?? obj.customer_email ?? null;
              if (email) row.email = email;

              const { data: existing } = await abonnes().select("id").eq("id", userId).maybeSingle();
              if (existing) {
                const { error } = await abonnes().update(row).eq("id", userId);
                if (error) throw error;
              } else {
                if (!row.email) {
                  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
                  row.email = u?.user?.email ?? "";
                }
                const { error } = await abonnes().insert(row);
                if (error) throw error;
              }
            }
          } else if (event.type === "invoice.payment_failed") {
            const subId = idOf(obj.subscription) ?? obj.parent?.subscription_details?.subscription ?? null;
            if (subId) {
              const { error } = await abonnes().update({ statut: "paiement_echoue" }).eq("stripe_subscription_id", subId);
              if (error) throw error;
            }
          } else if (event.type === "customer.subscription.deleted") {
            const { error } = await abonnes().update({ statut: "resilie" }).eq("stripe_subscription_id", obj.id);
            if (error) throw error;
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
