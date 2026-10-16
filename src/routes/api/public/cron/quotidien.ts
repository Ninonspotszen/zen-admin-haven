import { createFileRoute } from "@tanstack/react-router";

/**
 * Robot quotidien (Vercel Cron, voir vercel.json). Protégé par CRON_SECRET :
 * Vercel envoie automatiquement « Authorization: Bearer <CRON_SECRET> » à chaque passage.
 * Test manuel sans aucun envoi : même en-tête + « ?simulation=1 ».
 */
export const Route = createFileRoute("/api/public/cron/quotidien")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) return new Response("CRON_SECRET manquant", { status: 500 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return new Response("Non autorisé", { status: 401 });
        }
        const simulationForcee = new URL(request.url).searchParams.get("simulation") === "1";
        try {
          const { lancerRobotQuotidien } = await import("@/lib/emails-auto.server");
          return Response.json(await lancerRobotQuotidien({ simulationForcee }));
        } catch (e) {
          console.error("cron quotidien:", (e as Error).message);
          return new Response("Erreur du robot", { status: 500 });
        }
      },
    },
  },
});
