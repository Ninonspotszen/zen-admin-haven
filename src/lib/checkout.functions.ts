import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICES = {
  mensuel: "price_1UOH090tGinx8r1X86ru9g6N",
  annuel: "price_1UOH1g0tGinx8r1XblCvDInd",
} as const;

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ plan: z.enum(["mensuel", "annuel"]), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) throw new Error("Paiement indisponible");
    const origin = new URL(data.origin).origin;
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": PRICES[data.plan],
      "line_items[0][quantity]": "1",
      client_reference_id: context.userId,
      "subscription_data[trial_period_days]": "30",
      success_url: `${origin}/bibliotheque`,
      cancel_url: `${origin}/offres`,
    });
    const email = (context.claims as { email?: string })?.email;
    if (email) body.set("customer_email", email);
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Création du paiement impossible");
    return { url: json.url };
  });
