import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "./index";

export const Route = createFileRoute("/admin/audios")({
  head: () => ({
    meta: [
      { title: "Audios — Spots Zen Admin" },
      { name: "description", content: "Bibliothèque audio globale Spots Zen." },
      { property: "og:title", content: "Audios — Spots Zen Admin" },
      { property: "og:description", content: "Bibliothèque audio globale Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPlaceholder title="Audios" />,
});
