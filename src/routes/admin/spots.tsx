import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "./index";

export const Route = createFileRoute("/admin/spots")({
  head: () => ({
    meta: [
      { title: "Spots — Spots Zen Admin" },
      { name: "description", content: "Gestion des spots Spots Zen." },
      { property: "og:title", content: "Spots — Spots Zen Admin" },
      { property: "og:description", content: "Gestion des spots Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPlaceholder title="Spots" />,
});
