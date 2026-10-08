import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bibliotheque")({
  head: () => ({
    meta: [
      { title: "Bibliothèque — Spots Zen" },
      { name: "description", content: "Votre bibliothèque d'immersions bien-être Spots Zen." },
      { property: "og:title", content: "Bibliothèque — Spots Zen" },
      { property: "og:description", content: "Votre bibliothèque d'immersions bien-être Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BibliothequePage,
});

function BibliothequePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F6F2] px-6 dark:bg-[#0F1410]">
      <p className="text-center text-sm text-[#5A6B5C] dark:text-[#8B9B8B]">
        Votre bibliothèque arrive bientôt.
      </p>
    </div>
  );
}
