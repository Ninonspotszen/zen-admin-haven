/**
 * Limite de fréquence des formulaires publics (anti-robots, anti-abus).
 * L'adresse IP n'est jamais stockée en clair : seulement une empreinte (SHA-256 tronquée).
 * En cas de panne de la base, on laisse passer (un formulaire légitime ne doit jamais être bloqué par erreur).
 */
import { getRequest } from "@tanstack/react-start/server";

async function empreinteIp(): Promise<string | null> {
  try {
    const h = getRequest().headers;
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "";
    if (!ip) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`spotszen|${ip}`));
    return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/** Renvoie true si la demande doit être refusée ; sinon l'enregistre et renvoie false. */
export async function limiteDepassee(opts: {
  type: "contact" | "visiteur";
  parIpParHeure: number;
  totalParJour: number;
}): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const ip = await empreinteIp();
    const ilYa = (ms: number) => new Date(Date.now() - ms).toISOString();

    if (ip) {
      const { count } = await db.from("limites_tentatives").select("id", { count: "exact", head: true })
        .eq("cle", `${opts.type}:${ip}`).gte("created_at", ilYa(3600e3));
      if ((count ?? 0) >= opts.parIpParHeure) return true;
    }
    const { count: total } = await db.from("limites_tentatives").select("id", { count: "exact", head: true })
      .like("cle", `${opts.type}:%`).gte("created_at", ilYa(864e5));
    if ((total ?? 0) >= opts.totalParJour) return true;

    await db.from("limites_tentatives").insert({ cle: `${opts.type}:${ip ?? "inconnue"}` });
    return false;
  } catch (e) {
    console.error("limites:", (e as Error).message);
    return false;
  }
}
