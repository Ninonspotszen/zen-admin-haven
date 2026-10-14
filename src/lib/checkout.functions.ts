import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICES = {
  mensuel: "price_1UOHEe12YS5PWilJvjiRsLhe",
  annuel: "price_1UOHEi12YS5PWilJT8KiDnlI",
} as const;

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ plan: z.enum(["mensuel", "annuel"]), origin: z.string().url(), spotOrigineId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) throw new Error("Paiement indisponible");
    const origin = new URL(data.origin).origin;
    // Abonné existant : pas de double abonnement, essai réservé à la première souscription
    let withTrial = true;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: abo, error: aboError } = await (supabaseAdmin as any)
        .from("abonnes_b2c").select("statut, stripe_subscription_id").eq("id", context.userId).maybeSingle();
      if (!aboError) {
        if (abo?.stripe_subscription_id && (abo.statut === "actif" || abo.statut === "paiement_echoue")) {
          return { url: `${origin}/bibliotheque` };
        }
        withTrial = !abo?.stripe_subscription_id;
      }
    } catch {
      withTrial = true;
    }
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": PRICES[data.plan],
      "line_items[0][quantity]": "1",
      client_reference_id: context.userId,
      success_url: `${origin}/bibliotheque`,
      cancel_url: `${origin}/offres`,
    });
    if (withTrial) body.set("subscription_data[trial_period_days]", "30");
    const email = (context.claims as { email?: string })?.email;
    if (email) body.set("customer_email", email);
    if (data.spotOrigineId) {
      body.set("metadata[spot_origine_id]", data.spotOrigineId);
      body.set("subscription_data[metadata][spot_origine_id]", data.spotOrigineId);
    }
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Création du paiement impossible");
    return { url: json.url };
  });
