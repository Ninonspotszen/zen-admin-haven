import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import homeCss from "@/components/home-page.css?url";
import legalCss from "@/components/legal-page.css?url";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Spots Zen" },
      { name: "description", content: "Mentions légales du site et de l'application Spots Zen." },
      { property: "og:title", content: "Mentions légales — Spots Zen" },
      { property: "og:description", content: "Mentions légales du site et de l'application Spots Zen." },
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
  component: () => <LegalPage doc="mentions-legales" />,
});
