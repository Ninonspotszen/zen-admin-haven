import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/index";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/acces-refuse")({
  head: () => ({
    meta: [
      { title: i18n.t("access.meta.title") },
      { name: "description", content: "Vous n'avez pas accès au back-office Spots Zen." },
      { property: "og:title", content: "Accès refusé — Spots Zen Admin" },
      { property: "og:description", content: "Vous n'avez pas accès au back-office Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccesRefuse,
});

function AccesRefuse() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground">{t("access.h1")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("access.body")}
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("access.cta")}
          </Link>
        </div>
        <div className="mt-8 flex justify-center"><LanguageSwitcher /></div>
      </div>
    </div>
  );
}
