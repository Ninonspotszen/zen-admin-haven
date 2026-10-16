import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Formulaire /professionnels (livrable 7, automatisation déclenchée dans l'app) :
 * 1. la demande est enregistrée dans contact_requests (statut « nouvelle ») ;
 * 2. un email d'alerte part vers bonjour@spotszen.fr via Brevo, avec « Répondre » vers le prospect ;
 * 3. la demande apparaît en direct dans /admin/demandes ;
 * 4. la personne reçoit un accusé de réception (Brevo n°6, interrupteur EMAILS_ACTIFS) ;
 * 5. le contact est rangé dans la liste Brevo « Prospects B2B » (interrupteur BREVO_SYNC_ACTIF).
 * Si l'email échoue, la demande reste enregistrée (rien n'est perdu) et l'échec est noté.
 */

const SECTEURS = ["hebergements", "entreprises", "ecoles", "sante", "collectivites", "general"] as const;
// nullish : le formulaire envoie null pour un champ laissé vide (avant : refusé par erreur).
const opt = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

const inputSchema = z.object({
  secteur: z.enum(SECTEURS),
  nom: opt(200),
  email: z.string().trim().email().max(255),
  etablissement: opt(200),
  type_structure: opt(200),
  taille: opt(100),
  message: opt(5000),
  langue: z.string().max(5).optional(),
  refus_actualites: z.boolean().default(false),
  // Champ piège invisible : un humain le laisse vide, un robot le remplit.
  site_web: z.string().max(500).optional(),
});

const SECTEUR_LABEL: Record<(typeof SECTEURS)[number], string> = {
  hebergements: "Hébergement touristique",
  entreprises: "Entreprise",
  ecoles: "École / campus",
  sante: "Santé",
  collectivites: "Collectivité",
  general: "Général",
};

// Qui profitera de Spots Zen, selon la cible et la langue : complète une phrase de l'accusé de réception.
const PUBLIC_LABEL: Record<string, Record<(typeof SECTEURS)[number], string>> = {
  fr: { hebergements: "clients", entreprises: "collaborateurs", ecoles: "étudiants", sante: "patients", collectivites: "habitants et visiteurs", general: "visiteurs" },
  en: { hebergements: "guests", entreprises: "employees", ecoles: "students", sante: "patients", collectivites: "residents and visitors", general: "visitors" },
  de: { hebergements: "Gäste", entreprises: "Mitarbeitenden", ecoles: "Studierenden", sante: "Patientinnen und Patienten", collectivites: "Einwohner und Besucher", general: "Besucher" },
  nl: { hebergements: "gasten", entreprises: "medewerkers", ecoles: "studenten", sante: "patiënten", collectivites: "inwoners en bezoekers", general: "bezoekers" },
  es: { hebergements: "huéspedes", entreprises: "empleados", ecoles: "estudiantes", sante: "pacientes", collectivites: "vecinos y visitantes", general: "visitantes" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const envoyerDemandeContact = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.site_web) return { ok: true as const }; // robot : on fait comme si, sans rien enregistrer
    // Anti-abus : 5 demandes par heure et par connexion, 50 par jour au total.
    const { limiteDepassee } = await import("@/lib/limites.server");
    if (await limiteDepassee({ type: "contact", parIpParHeure: 5, totalParJour: 50 })) throw new Error("Trop de demandes");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { site_web: _piege, langue, refus_actualites, ...row } = data;
    const { data: inserted, error } = await supabaseAdmin
      .from("contact_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ ...row, statut: "nouvelle", refus_actualites } as any)
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("contact: enregistrement impossible", error?.message);
      throw new Error("Enregistrement impossible");
    }

    const { sendBrevoInternalAlert } = await import("@/lib/brevo.server");
    const ligne = (label: string, v: string | null) =>
      v ? `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;vertical-align:top">${label}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "";
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1c2e1e">
<p>Nouvelle demande reçue depuis le formulaire <b>${SECTEUR_LABEL[data.secteur]}</b> du site.</p>
<table style="border-collapse:collapse">${ligne("Nom / fonction", data.nom)}${ligne("Email", data.email)}${ligne("Établissement", data.etablissement)}${ligne("Type", data.type_structure)}${ligne("Taille", data.taille)}</table>
${data.message ? `<p style="margin-top:16px;white-space:pre-wrap;border-left:3px solid #2D5A27;padding-left:12px">${esc(data.message)}</p>` : ""}
<p style="margin-top:16px;color:#6b6b6b">Répondez directement à cet email pour écrire à la personne. La demande est aussi dans l'admin, onglet « Demandes ».</p>
</div>`;
    const statut = await sendBrevoInternalAlert({
      subject: `Nouvelle demande · ${SECTEUR_LABEL[data.secteur]}${data.etablissement ? ` · ${data.etablissement}` : ""}`,
      html,
      replyTo: { email: data.email, name: data.nom },
    });

    // Accusé de réception au prospect : la personne sait que sa demande est arrivée.
    const { sendBrevoTemplate, syncBrevoContact, modele } = await import("@/lib/brevo.server");
    const m = modele("accuseB2b", langue);
    const accuse = await sendBrevoTemplate({
      templateId: m.templateId,
      toEmail: data.email,
      toName: data.nom,
      params: { ETABLISSEMENT: data.etablissement, PUBLIC: PUBLIC_LABEL[m.langue]![data.secteur] },
    });
    await supabaseAdmin
      .from("contact_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ notification: statut, accuse_reception: accuse } as any)
      .eq("id", inserted.id);
    // Liste « Prospects B2B » : suivi de la demande. « Actualités pro » seulement si la personne n'a pas refusé.
    await syncBrevoContact({
      email: data.email,
      nom: data.nom,
      langue: m.langue,
      listes: refus_actualites ? ["PROSPECTS_B2B"] : ["PROSPECTS_B2B", "ACTUALITES_PRO"],
      retirerDe: refus_actualites ? ["ACTUALITES_PRO"] : [],
    });
    return { ok: true as const };
  });
