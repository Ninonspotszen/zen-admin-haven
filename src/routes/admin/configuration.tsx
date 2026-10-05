import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — Spots Zen Admin" },
      { name: "description", content: "Configuration des spots Spots Zen." },
      { property: "og:title", content: "Configuration — Spots Zen Admin" },
      { property: "og:description", content: "Configuration des spots Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Configuration</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette section sera construite prochainement.
      </p>
    </div>
  ),
});
