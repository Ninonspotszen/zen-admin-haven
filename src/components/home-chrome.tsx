import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
const STORAGE = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/";
const LOGO = STORAGE + "SpotsZen-logo-transparent-fonce.png";
const LOGO_LIGHT = STORAGE + "SpotsZen-logo-transparent-clair.png";
const LANGS = ["fr", "en", "de", "nl", "es"];
function Cta({ children }: { children: React.ReactNode; to: "/offres" }) {
 return <Button asChild className="home-cta"><Link to="/offres">{children}<ArrowRight aria-hidden="true" /></Link></Button>;
}
export function HomeHeader({ anchorPrefix = "" }: { anchorPrefix?: string }) {
  const [lang, setLang] = useState("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("sz_lang"); if (saved && LANGS.includes(saved)) setLang(saved); }, []);
  return <header className="home-header"><div className="home-header-inner">
      <Link to="/" aria-label="SpotsZen — accueil"><img src={LOGO} alt="SpotsZen" className="home-logo" width={180} height={48} /></Link>
      <nav className="home-nav" aria-label="Navigation principale"><a href={anchorPrefix + "#bibliotheque"}>La Bibliothèque</a><a href={anchorPrefix + "#etablissements"}>Pour les établissements</a><a href={anchorPrefix + "#contact"}>Contact</a></nav>
      <div className="home-header-actions"><div className="home-language"><Button variant="ghost" aria-label="Choisir la langue" aria-expanded={langOpen} onClick={() => setLangOpen(!langOpen)}>{lang.toUpperCase()}<ChevronDown /></Button>
        {langOpen && <div className="home-language-menu">{LANGS.map(l => <Button variant="ghost" key={l} aria-pressed={l === lang} onClick={() => { setLang(l); localStorage.setItem("sz_lang", l); setLangOpen(false); }}>{l.toUpperCase()}</Button>)}</div>}
      </div><Button asChild variant="outline" size="icon" className="home-account" aria-label="Connexion"><Link to="/connexion"><UserRound /></Link></Button><div className="home-header-cta"><Cta to="/offres">Commencer — 5€/mois</Cta></div><Button variant="ghost" size="icon" className="home-menu-toggle" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div>
    </div>{menuOpen && <nav className="home-mobile-nav" aria-label="Navigation mobile" onClick={() => setMenuOpen(false)}><a href={anchorPrefix + "#bibliotheque"}>La Bibliothèque</a><a href={anchorPrefix + "#etablissements"}>Pour les établissements</a><a href={anchorPrefix + "#contact"}>Contact</a><Link to="/offres">Commencer — 5€/mois →</Link></nav>}</header>;
}
export function HomeFooter({ anchorPrefix = "" }: { anchorPrefix?: string }) {
return <footer className="home-footer"><div className="home-container"><div className="home-footer-grid"><div className="home-footer-brand"><img src={LOGO_LIGHT} alt="SpotsZen" width={190} height={52} loading="lazy" /><p>Des moments de calme, partout où la vie nous emmène.</p></div><div><h3>Explorer</h3><a href={anchorPrefix + "#concept"}>Le concept</a><a href={anchorPrefix + "#bienfaits"}>Les bienfaits</a><a href={anchorPrefix + "#bibliotheque"}>La Bibliothèque</a></div><div><h3>Professionnels</h3><a href={anchorPrefix + "#etablissements"}>Pour les établissements</a><a href="mailto:bonjour@spotszen.fr?subject=Demander%20une%20d%C3%A9mo">Demander une démo</a><a href={anchorPrefix + "#contact"}>Nous contacter</a></div><div><h3>Restons en lien</h3><a href="mailto:bonjour@spotszen.fr">bonjour@spotszen.fr</a><a href="mailto:bonjour@spotszen.fr?subject=Prendre%20rendez-vous">Prendre rendez-vous</a></div></div><div className="home-footer-bottom"><p>© 2026 Spots Zen. Tous droits réservés.</p><div><a href="mailto:bonjour@spotszen.fr?subject=Mentions%20l%C3%A9gales">Mentions légales</a><a href="mailto:bonjour@spotszen.fr?subject=Conditions%20d'utilisation">Conditions d'utilisation</a><a href="mailto:bonjour@spotszen.fr?subject=Politique%20de%20confidentialit%C3%A9">Politique de confidentialité</a></div></div></div></footer>;
}
