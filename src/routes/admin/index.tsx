import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Spots Zen Admin" },
      { name: "description", content: "Tableau de bord du back-office Spots Zen." },
      { property: "og:title", content: "Dashboard — Spots Zen Admin" },
      { property: "og:description", content: "Tableau de bord du back-office Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPlaceholder title="Dashboard" />,
});

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette section sera construite prochainement.
      </p>
    </div>
  );
}
