import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const giftSchema = z.object({
  prenom: z.string().trim().max(100).optional(),
  nom: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Adresse email invalide").max(255),
  spotId: z.string().uuid("Spot invalide").optional(),
  dureeJours: z.number().int().min(1, "Durée minimale : 1 jour").max(365, "Durée maximale : 365 jours").default(30),
  codeParrainage: z.string().trim().max(50).optional(),
  message: z.string().trim().max(1000).optional(),
});

export const giftAccess = createServerFn({ method: "POST" })
  .inputValidator((input) => giftSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    // Vérifie le rôle admin côté serveur avant toute écriture.
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");

    const dateFin = new Date(Date.now() + data.dureeJours * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // abonnes_b2c.id référence auth.users : on crée (ou réutilise) le compte auth.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { prenom: data.prenom ?? null, nom: data.nom ?? null, source: "acces_offert" },
    });
    let userId = created?.user?.id;
    if (!userId) {
      // Le compte existe peut-être déjà : on le retrouve par email.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      userId = list?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase())?.id;
    }
    if (!userId) throw new Error(createError?.message ?? "Impossible de créer le compte utilisateur");

    const { data: inserted, error } = await context.supabase
      .from("abonnes_b2c")
      .insert({
        id: userId,
        email: data.email,
        prenom: data.prenom || null,
        statut: "offert",
        spot_origine_id: data.spotId ?? null,
        date_fin_acces: dateFin,
        code_parrainage: data.codeParrainage || null,
        note_interne: data.message || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Webhook Make : optionnel tant que l'URL n'est pas configurée.
    const webhookUrl = process.env["MAKE_GIFT_ACCESS_WEBHOOK_URL"];
    let webhookSent = false;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          abonneId: inserted.id,
          action: "gift_access",
          email: data.email,
          prenom: data.prenom ?? null,
          nom: data.nom ?? null,
          spotId: data.spotId ?? null,
          dureeJours: data.dureeJours,
          dateFinAcces: dateFin,
          codeParrainage: data.codeParrainage ?? null,
          message: data.message ?? null,
        }),
      });
      if (!res.ok) throw new Error(`Accès créé, mais le webhook Make a répondu avec le code ${res.status}`);
      webhookSent = true;
    }
    return { ok: true, id: inserted.id, webhookSent };
  });
