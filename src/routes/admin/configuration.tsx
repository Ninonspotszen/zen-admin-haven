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
  component: () => <AdminPlaceholder title="Configuration" />,
});
