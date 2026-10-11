import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/i18n/index";
import { HomePage } from "@/components/home-page";
import homeCss from "@/components/home-page.css?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: i18n.t("home.meta.title") },
      { name: "description", content: i18n.t("home.meta.description") },
      { property: "og:title", content: i18n.t("home.meta.title") },
      { property: "og:description", content: "Un QR code dans votre espace. Vos visiteurs accèdent en deux secondes à une bibliothèque d'immersions audio bien-être." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" },
      { rel: "stylesheet", href: homeCss },
    ],
  }),
  component: HomePage,
});
