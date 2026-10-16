import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Case « Recevoir les nouvelles de Spots Zen » (Mon abonnement, bibliothèque).
 * Consentement libre, jamais pré-coché, retirable à tout moment (RGPD art. 7, CPCE art. L.34-5) :
 * la date est gardée comme preuve et la liste Brevo « Newsletter » suit le choix.
 */
export const changerNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ok: z.boolean() }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("changer_newsletter", { p_ok: data.ok });
    if (error) throw new Error(error.message);
    const { data: u } = await context.supabase.auth.getUser();
    const email = u.user?.email;
    if (email) {
      const { syncBrevoContact } = await import("@/lib/brevo.server");
      await syncBrevoContact(
        data.ok ? { email, extId: context.userId, listes: ["NEWSLETTER"] } : { email, retirerDe: ["NEWSLETTER"] },
      );
    }
    return { ok: true as const };
  });

/**
 * Visiteur d'un spot (QR code) qui demande à recevoir le lien pour continuer chez lui.
 * - un seul email par adresse et par spot (index unique) : impossible d'inonder quelqu'un ;
 * - champ piège anti-robot ;
 * - l'adresse ne rejoint le CRM Brevo que si la personne a coché la case newsletter.
 */
const visiteurSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  spotId: z.string().uuid(),
  langue: z.string().max(5).optional(),
  newsletter: z.boolean().default(false),
  site_web: z.string().max(500).optional(),
});

export const enregistrerVisiteurSpot = createServerFn({ method: "POST" })
  .inputValidator((d) => visiteurSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.site_web) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { data: spot } = await db.from("spots").select("id, nom, statut, clients(nom)").eq("id", data.spotId).maybeSingle();
    if (!spot) throw new Error("Spot introuvable");
    const lieu: string | null = spot.clients?.nom ?? spot.nom ?? null;
    const langue = (data.langue ?? "fr").slice(0, 2);

    const { data: lead, error } = await db
      .from("spot_leads")
      .insert({ email: data.email, spot_id: data.spotId, langue, newsletter_ok: data.newsletter })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: true as const }; // déjà envoyé pour ce spot : on ne renvoie pas
      console.error("spot_leads:", error.message);
      throw new Error("Enregistrement impossible");
    }

    const { sendBrevoTemplate, syncBrevoContact, modele } = await import("@/lib/brevo.server");
    const statut = await sendBrevoTemplate({
      templateId: modele("visiteurSpot", langue).templateId,
      toEmail: data.email,
      params: { LIEU: lieu, SPOT_ID: data.spotId, NEWSLETTER: data.newsletter ? "oui" : null },
    });
    await db.from("spot_leads").update({ email_statut: statut }).eq("id", lead.id);
    if (data.newsletter) await syncBrevoContact({ email: data.email, langue, listes: ["VISITEURS_SPOTS", "NEWSLETTER"] });
    return { ok: true as const };
  });

/**
 * Bouton « Tester le robot » de l'onglet Emails (admin) : lance le robot quotidien en simulation.
 * Rien n'est envoyé ni enregistré ; renvoie la liste des emails qui partiraient aujourd'hui.
 */
export const testerRobotQuotidien = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { lancerRobotQuotidien } = await import("@/lib/emails-auto.server");
    return lancerRobotQuotidien({ simulationForcee: true });
  });
