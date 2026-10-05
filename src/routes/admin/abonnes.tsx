import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "./index";

export const Route = createFileRoute("/admin/abonnes")({
  head: () => ({
    meta: [
      { title: "Abonnés — Spots Zen Admin" },
      { name: "description", content: "Gestion des abonnés et ambassadeurs Spots Zen." },
      { property: "og:title", content: "Abonnés — Spots Zen Admin" },
      { property: "og:description", content: "Gestion des abonnés et ambassadeurs Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPlaceholder title="Abonnés" />,
});
