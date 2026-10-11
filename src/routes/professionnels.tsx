import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/i18n/index";
import { ProfessionnelsPage } from "@/components/professionnels-page";
import homeCss from "@/components/home-page.css?url";
import pageCss from "@/components/professionnels-page.css?url";

export const Route = createFileRoute("/professionnels")({
  head: () => ({
    meta: [
      { title: i18n.t("pro.meta.title") },
      { name: "description", content: "Offrez à vos visiteurs, collaborateurs ou étudiants une immersion bien-être unique, accessible par QR code, sans application." },
      { property: "og:title", content: "Spots Zen pour les professionnels" },
      { property: "og:description", content: "Une bibliothèque d'audios bien-être accessible en deux secondes pour hébergements, entreprises, écoles, santé et collectivités." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" },
      { rel: "stylesheet", href: homeCss },
      { rel: "stylesheet", href: pageCss },
    ],
  }),
  component: ProfessionnelsPage,
});
