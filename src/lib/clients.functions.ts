import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const triggerActivationEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (typeof data !== "string" || !/^[0-9a-fA-F-]{36}$/.test(data)) {
      throw new Error("Identifiant client invalide");
    }
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    // Vérifie le rôle admin côté serveur avant tout appel externe.
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");

    const webhookUrl = process.env["MAKE_ACTIVATE_WEBHOOK_URL"];
    if (!webhookUrl) {
      throw new Error(
        "Webhook Make non configuré : ajoute la variable MAKE_ACTIVATE_WEBHOOK_URL",
      );
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: data, action: "activate" }),
    });
    if (!res.ok) {
      throw new Error(`Le webhook Make a répondu avec le code ${res.status}`);
    }
    return { ok: true };
  });
