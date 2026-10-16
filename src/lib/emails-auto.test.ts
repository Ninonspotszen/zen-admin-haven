/* eslint-disable @typescript-eslint/no-explicit-any */
// Test du robot quotidien : base et Brevo simulés en mémoire, aucun appel réseau. Lancer : npx vitest run src/lib/emails-auto.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const tables: Record<string, any[]> = {};
const sent: any[] = [];
function q(table: string) {
  let rows = () => tables[table] ?? [];
  const filters: ((r: any) => boolean)[] = [];
  const api: any = {
    select: () => api, limit: () => api, order: () => api,
    eq: (k: string, v: any) => (filters.push((r) => r[k] === v), api),
    gte: (k: string, v: any) => (filters.push((r) => r[k] >= v), api),
    not: () => api,
    maybeSingle: async () => ({ data: rows().filter((r) => filters.every((f) => f(r)))[0] ?? null }),
    then: (res: any) => res({ data: rows().filter((r) => filters.every((f) => f(r))), error: null }),
    insert: (row: any) => {
      tables[table] = tables[table] ?? [];
      const dup = row.cle && tables[table]!.some((r) => r.cle === row.cle);
      const ins: any = { select: () => ins, single: async () => dup ? { data: null, error: { code: "23505" } } : (tables[table]!.push({ id: String(Math.random()), statut: "en_cours", ...row }), { data: tables[table]!.at(-1), error: null }),
        then: (res: any) => res(dup ? { error: { code: "23505" } } : (tables[table]!.push({ id: "x", ...row }), { error: null })) };
      return ins;
    },
    update: (u: any) => ({ eq: async (k: string, v: any) => { for (const r of tables[table] ?? []) if (r[k] === v) Object.assign(r, u); return { error: null }; } }),
  };
  return api;
}
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: q } }));
vi.mock("@/lib/brevo.server", async (orig) => {
  const real: any = await orig();
  return { ...real, sendBrevoTemplate: async (o: any) => (sent.push(o), "sent"), sendBrevoInternalAlert: async (o: any) => (sent.push({ interne: o.subject, html: o.html }), "sent") };
});

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }); };
const ago = (j: number) => new Date(Date.now() - j * 864e5).toISOString();

describe("robot quotidien", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-12-10T07:00:00Z"));
    for (const k of Object.keys(tables)) delete tables[k]; sent.length = 0;
    process.env["EMAILS_ACTIFS"] = "true";
    const base = { prenom: "Léa", formule: null, date_fin_prevue: null, date_renouvellement: null, langue_preferee: null, derniere_connexion: null };
    tables["abonnes_b2c"] = [
      { ...base, id: "j7", email: "j7@x.fr", statut: "offert", created_at: ago(23), date_fin_acces: day(7), derniere_connexion: ago(1) },
      { ...base, id: "fin", email: "fin@x.fr", statut: "offert", created_at: ago(31), date_fin_acces: day(-1) },
      { ...base, id: "j3", email: "j3@x.fr", statut: "actif", formule: "mensuel", created_at: ago(3.2), langue_preferee: "de" },
      { ...base, id: "inactif", email: "inactif@x.fr", statut: "actif", formule: "mensuel", created_at: ago(40), derniere_connexion: ago(20) },
      { ...base, id: "annuel", email: "annuel@x.fr", statut: "actif", formule: "annuel", created_at: ago(330), date_renouvellement: day(40), derniere_connexion: ago(1) },
      { ...base, id: "annuel-essai", email: "essai@x.fr", statut: "actif", formule: "annuel", created_at: ago(2), date_renouvellement: day(40) },
      { ...base, id: "test-ancien", email: "test@x.fr", statut: "actif", formule: "mensuel", created_at: "2026-10-10T10:00:00Z" },
      { ...base, id: "resilie", email: "res@x.fr", statut: "resilie", created_at: ago(60) },
    ];
    tables["contact_requests"] = []; tables["clients"] = []; tables["emails_automatiques"] = [];
  });

  it("envoie le bon email à la bonne personne, une seule fois", async () => {
    const { lancerRobotQuotidien } = await import("@/lib/emails-auto.server");
    const r1 = await lancerRobotQuotidien();
    const parType = Object.fromEntries(r1.envois.map((e) => [e.email, e.type]));
    console.log(parType, r1.resume);
    expect(parType).toMatchObject({ "j7@x.fr": "acces_j7", "fin@x.fr": "acces_fin", "j3@x.fr": "accueil_j3", "inactif@x.fr": "relance_inactif", "annuel@x.fr": "rappel_annuel" });
    expect(parType["essai@x.fr"]).toBeUndefined(); // ni rappel annuel pendant l essai, ni accueil avant J+3
    expect(parType["res@x.fr"]).toBeUndefined();
    expect(sent.find((s) => s.toEmail === "annuel@x.fr").params.DATE_LIMITE).toBeTruthy();
    // Langue : l'abonné germanophone reçoit le modèle allemand, les autres le français.
    expect(sent.find((s) => s.toEmail === "j3@x.fr").templateId).toBe(42);
    expect(sent.find((s) => s.toEmail === "j7@x.fr").templateId).toBe(13);
    expect(sent.find((s) => s.toEmail === "annuel@x.fr").params.MONTANT).toMatch(/^49\s€$/); // espace insécable fine, comme en typographie française
    const nb = sent.filter((s) => s.toEmail).length;
    const r2 = await lancerRobotQuotidien();
    expect(r2.envois.length).toBe(0);
    expect(sent.filter((s) => s.toEmail).length).toBe(nb);
    expect(r2.resume).toBe("deja_envoye");
  });

  it("simulation : rien n'est envoyé ni enregistré", async () => {
    process.env["EMAILS_ACTIFS"] = "false";
    const { lancerRobotQuotidien } = await import("@/lib/emails-auto.server");
    const r = await lancerRobotQuotidien({ simulationForcee: true });
    expect(r.simulation).toBe(true);
    expect(r.envois.length).toBeGreaterThan(3);
    expect(sent.length).toBe(0);
    expect(tables["emails_automatiques"]!.length).toBe(0);
  });
});
