import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "./index";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({
    meta: [
      { title: "Clients B2B — Spots Zen Admin" },
      { name: "description", content: "Gestion des clients B2B Spots Zen." },
      { property: "og:title", content: "Clients B2B — Spots Zen Admin" },
      { property: "og:description", content: "Gestion des clients B2B Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPlaceholder title="Clients B2B" />,
});
