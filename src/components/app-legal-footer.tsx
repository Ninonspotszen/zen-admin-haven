import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { STRIPE_PORTAL_URL } from "@/lib/stripe-portal";

const linkCls = "py-1 underline-offset-2 hover:underline";

/** decouvrir : liens vers le site vitrine, affichés seulement sur la page des offres
 *  (décision du 16/10/2026 : pas pendant l'expérience, ni sur le spot ni dans la bibliothèque). */
export function AppLegalFooter({ decouvrir = false }: { decouvrir?: boolean }) {
  const { t } = useTranslation();
  return (
    <footer className="mx-auto max-w-md px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-[12px] leading-6 text-current opacity-70">
      {decouvrir && (
        <nav aria-label={t("footer.discover.label")} className="mb-2 flex flex-wrap items-center justify-center gap-x-2 text-[13px] font-medium">
          <a href="/" className={linkCls}>{t("footer.discover.site")}</a>
          <span aria-hidden>·</span>
          <a href="/professionnels" className={linkCls}>{t("footer.discover.pro")}</a>
        </nav>
      )}
      <nav className="flex flex-wrap items-center justify-center gap-x-2">
        <Link to="/mentions-legales" className={linkCls}>{t("footer.legal")}</Link>
        <span aria-hidden>·</span>
        <Link to="/cgv" className={linkCls}>{t("footer.cgv")}</Link>
        <span aria-hidden>·</span>
        <Link to="/politique-confidentialite" className={linkCls}>{t("footer.privacy")}</Link>
        <span aria-hidden>·</span>
        <a href={STRIPE_PORTAL_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>{t("footer.cancel")}</a>
      </nav>
    </footer>
  );
}
