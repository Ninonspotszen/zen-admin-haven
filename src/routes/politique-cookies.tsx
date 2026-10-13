import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import homeCss from "@/components/home-page.css?url";
import legalCss from "@/components/legal-page.css?url";

export const Route = createFileRoute("/politique-cookies")({
  head: () => ({
    meta: [
      { title: "Politique de cookies — Spots Zen" },
      { name: "description", content: "Politique de cookies du site et de l'application Spots Zen." },
      { property: "og:title", content: "Politique de cookies — Spots Zen" },
      { property: "og:description", content: "Politique de cookies du site et de l'application Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" },
      { rel: "stylesheet", href: homeCss },
      { rel: "stylesheet", href: legalCss },
    ],
  }),
  component: () => <LegalPage doc="politique-cookies" />,
});
