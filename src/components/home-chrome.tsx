import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
const STORAGE = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/";
const LOGO = STORAGE + "SpotsZen-logo-transparent-fonce.png";
const LOGO_LIGHT = STORAGE + "SpotsZen-logo-transparent-clair.png";
function Cta({ children }: { children: React.ReactNode; to: "/offres" }) {
 return <Button asChild className="home-cta"><Link to="/offres">{children}<ArrowRight aria-hidden="true" /></Link></Button>;
}
export function HomeHeader({ anchorPrefix = "" }: { anchorPrefix?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  return <header className="home-header"><div className="home-header-inner">
      <Link to="/" aria-label={t("nav.home.ariaLabel")}><img src={LOGO} alt="SpotsZen" className="home-logo" width={180} height={48} /></Link>
      <nav className="home-nav" aria-label="Navigation principale"><a href="/particuliers">{t("nav.particuliers")}</a><a href="/professionnels">{t("nav.professionnels")}</a><a href={anchorPrefix + "#contact"}>{t("nav.contact")}</a></nav>
      <div className="home-header-actions"><Button asChild variant="outline" size="icon" className="home-account" aria-label={t("nav.account.ariaLabel")}><Link to="/connexion"><UserRound /></Link></Button><div className="home-header-cta"><Cta to="/offres">{t("nav.cta")}</Cta></div><Button variant="ghost" size="icon" className="home-menu-toggle" aria-label={menuOpen ? t("nav.menu.close") : t("nav.menu.open")} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div>
    </div>{menuOpen && <nav className="home-mobile-nav" aria-label="Navigation mobile" onClick={() => setMenuOpen(false)}><a href="/particuliers">{t("nav.particuliers")}</a><a href="/professionnels">{t("nav.professionnels")}</a><a href={anchorPrefix + "#contact"}>{t("nav.contact")}</a><Link to="/offres">{t("nav.mobile.cta")}</Link></nav>}</header>;
}
export function HomeFooter({ anchorPrefix = "" }: { anchorPrefix?: string }) {
const { t } = useTranslation();
return <footer className="home-footer"><div className="home-container"><div className="home-footer-grid"><div className="home-footer-brand"><img src={LOGO_LIGHT} alt="SpotsZen" width={190} height={52} loading="lazy" /><p>{t("footer.tagline")}</p></div><div><h3>{t("footer.col1.title")}</h3><a href={anchorPrefix + "#concept"}>{t("footer.col1.concept")}</a><a href={anchorPrefix + "#bienfaits"}>{t("footer.col1.bienfaits")}</a><a href={anchorPrefix + "#bibliotheque"}>{t("footer.col1.bibliotheque")}</a></div><div><h3>{t("footer.col2.title")}</h3><a href={anchorPrefix + "#etablissements"}>{t("footer.col2.etablissements")}</a><a href="mailto:bonjour@spotszen.fr?subject=Demander%20une%20d%C3%A9mo">{t("footer.col2.demo")}</a><a href={anchorPrefix + "#contact"}>{t("footer.col2.contact")}</a></div><div><h3>{t("footer.col3.title")}</h3><a href="mailto:bonjour@spotszen.fr">bonjour@spotszen.fr</a><a href="mailto:bonjour@spotszen.fr?subject=Prendre%20rendez-vous">{t("footer.col3.rdv")}</a></div></div><div className="home-footer-bottom"><p>{t("footer.copyright")}</p><div><a href="mailto:bonjour@spotszen.fr?subject=Mentions%20l%C3%A9gales">{t("footer.legal")}</a><a href="mailto:bonjour@spotszen.fr?subject=Conditions%20d'utilisation">{t("footer.cgu")}</a><a href="mailto:bonjour@spotszen.fr?subject=Politique%20de%20confidentialit%C3%A9">{t("footer.privacy")}</a></div><LanguageSwitcher /></div></div></footer>;
}
