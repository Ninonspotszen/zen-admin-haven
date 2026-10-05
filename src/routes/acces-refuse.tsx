import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/acces-refuse")({
  head: () => ({
    meta: [
      { title: "Accès refusé — Spots Zen Admin" },
      { name: "description", content: "Vous n'avez pas accès au back-office Spots Zen." },
      { property: "og:title", content: "Accès refusé — Spots Zen Admin" },
      { property: "og:description", content: "Vous n'avez pas accès au back-office Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccesRefuse,
});

function AccesRefuse() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground">Accès refusé</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Votre compte ne dispose pas des droits administrateur nécessaires pour
          accéder au back-office Spots Zen.
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
