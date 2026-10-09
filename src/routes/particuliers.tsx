import { createFileRoute } from "@tanstack/react-router";
import { ParticuliersPage } from "@/components/particuliers-page";
import homeCss from "@/components/home-page.css?url";
import pageCss from "@/components/particuliers-page.css?url";

export const Route = createFileRoute("/particuliers")({
  head: () => ({
    meta: [
      { title: "La bibliothèque pour vous — Spots Zen" },
      { name: "description", content: "Le bon audio, au bon moment. Des immersions guidées par des voix humaines et des musiques originales. Spots Zen dès 5€/mois, premier mois offert." },
      { property: "og:title", content: "La bibliothèque pour vous — Spots Zen" },
      { property: "og:description", content: "Sommeil, concentration, gestion du stress : retrouvez votre sérénité avec la bibliothèque Spots Zen. Premier mois offert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" },
      { rel: "stylesheet", href: homeCss },
      { rel: "stylesheet", href: pageCss },
    ],
  }),
  component: ParticuliersPage,
});