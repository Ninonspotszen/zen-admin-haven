import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HomeHeader, HomeFooter } from "@/components/home-chrome";
import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, ChevronDown, Menu, X, Moon, Heart, Sun, Wind, Clock3, UsersRound, Headphones, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoButton } from "@/components/video-modal";
import forestLake from "@/assets/home-forest-lake.jpg";
import sunsetLake from "@/assets/home-sunset-lake.jpg";
import pwaLibrary from "@/assets/pwa-bibliotheque.webp";
import pwaPlayer from "@/assets/pwa-player.webp";

// Passer à true uniquement avec de vrais avis clients (faux avis interdits : art. L121-4 C. conso).
const SHOW_REVIEWS = false;
const STORAGE = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/";
const LOGO = STORAGE + "SpotsZen-logo-transparent-fonce.png";
const LOGO_LIGHT = STORAGE + "SpotsZen-logo-transparent-clair.png";
const PICTO = STORAGE + "SpotsZen-picto-vert.png";
const LANGS = ["fr", "en", "de", "nl", "es"];
const audios = [
  { moment: "morning", title: "Le Réveil du corps", duration: "8 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20reveil%20du%20corps.jpg", Icon: Sun },
  { moment: "day", title: "La Sieste réparatrice", duration: "20 min", image: STORAGE + "spots%20zen%20meditation%20guidee%20%20sommeil%20sieste%20reparatrice.jpg", Icon: Wind },
  { moment: "evening", title: "Glisser vers le sommeil", duration: "18 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20glisser%20vers%20le%20sommeil.jpg", Icon: Moon },
  { moment: "evening", title: "Songe du soir — Orage", duration: "16 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20sommeil%20-%20orage%20du%20soir.jpg", Icon: Moon },
] as const;
const benefits = [
  { Icon: Moon, title: "Un meilleur sommeil", text: "Laissez la journée derrière vous et retrouvez des nuits plus sereines." },
  { Icon: Heart, title: "Moins de stress", text: "Quelques minutes pour souffler, relâcher et revenir à l'essentiel." },
  { Icon: Sun, title: "Plus de concentration", text: "Faites de la place à vos idées et retrouvez votre clarté d'esprit." },
  { Icon: Wind, title: "Une cohérence cardiaque", text: "Un rythme simple pour apaiser le corps et l'esprit, où que vous soyez." },
  { Icon: Clock3, title: "Un guide selon l'heure", text: "La bonne immersion, au bon moment de votre journée." },
  { Icon: UsersRound, title: "Pour toute la famille", text: "Des instants de calme à partager, à chaque âge et à votre rythme." },
];
const craft = [
  { eyebrow: "DES TECHNIQUES DE RELAXATION RECONNUES", title: "Le fond avant", italic: "la forme.", text: "Chaque scénario utilise des techniques reconnues comme l'hypnose eriksonnienne, le Yoga Nidra ou la cohérence cardiaque. Ils sont écrits pour accompagner un besoin réel, avec des pratiques de relaxation accessibles et éprouvées. Chaque mot est juste pour créer la sensation recherchée.", name: "Ninon Godin", role: "Fondatrice", image: forestLake, label: "01 — L'INTENTION", time: 119, thumb: STORAGE + "spots%20zen%20extrait%20video%20ninon.png" },
  { eyebrow: "DES VOIX INCARNÉES", title: "Une présence", italic: "qui vous accompagne.", text: "Une voix masculine (Stefan), une voix féminine (Ninon). Des voix enveloppantes et professionnelles enregistrées en studio, qui trouvent le ton juste pour vous guider sans jamais s'imposer.", name: "Stefan Godin", role: "Comédien", image: sunsetLake, label: "02 — LES VOIX", time: 75, thumb: STORAGE + "spots%20zen%20extrait%20video%20stefan.png" },
  { eyebrow: "UNE MUSIQUE COMPOSÉE SUR MESURE", title: "Une émotion", italic: "à part entière.", text: "Des compositions originales avec fréquences binaurales qui offrent une immersion complète. Des sons naturels captés à Lacanau (la pluie, l'orage, l'eau...). La nature, telle qu'elle est. Chaque composition originale prolonge l'immersion et laisse une place au silence, à l'imaginaire, à votre propre rythme.", name: "Benoît Courti", role: "Compositeur", image: forestLake, label: "03 — LA MUSIQUE", time: 50, thumb: STORAGE + "spots%20zen%20extrait%20video%20musique.png" },
];
const businessReviews = [
  { text: "\"Une petite attention qui change tout dans l'expérience de nos vacanciers. Simple à mettre en place, et très appréciée.\"", name: "Directeur de camping 4★", place: "Gironde" },
  { text: "\"Un outil concret pour permettre à nos équipes de faire une vraie pause, même dans les journées les plus chargées.\"", name: "Responsable RH", place: "Entreprise partenaire" },
  { text: "\"Nous voulions rendre le bien-être accessible à tous les habitants. Spots Zen nous a permis de le faire simplement.\"", name: "Élu·e d'une commune", place: "Collectivité partenaire" },
];
const personalReviews = [
  { text: "\"J'ai enfin trouvé un rituel pour me poser le soir. La voix, la musique... tout m'aide à décrocher.\"", name: "Sophie", place: "Paris" },
  { text: "\"Quelques minutes suffisent à changer le cours de ma journée. C'est devenu mon petit rendez-vous avec moi-même.\"", name: "Pierre", place: "Bordeaux" },
  { text: "\"J'aime la simplicité : je choisis ce dont j'ai besoin et je me laisse guider. C'est une vraie respiration.\"", name: "Marie", place: "Lyon" },
  { text: "\"Une belle découverte pour toute la famille. On se retrouve même à écouter certaines immersions ensemble.\"", name: "Thomas", place: "Nantes" },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="home-eyebrow">{children}</p>;
}
function Picto({ light = false }: { light?: boolean }) {
  return <img src={PICTO} alt="" width={36} height={36} className={light ? "home-picto home-picto-light" : "home-picto"} />;
}
function Cta({ children, href, to }: { children: ReactNode; href?: string; to?: "/offres" }) {
  return <Button asChild className="home-cta">{to ? <Link to={to}>{children}<ArrowRight aria-hidden="true" /></Link> : <a href={href}>{children}<ArrowRight aria-hidden="true" /></a>}</Button>;
}
function CraftThumb({ time, title, image }: { time: number; title: string; image: string }) {
  const { t } = useTranslation();
  return <VideoButton className="home-craft-thumb" time={time} label={t("home.craft.excerptAria", { title })} style={{ display: "block", textDecoration: "none", color: "inherit", borderRadius: 12, overflow: "hidden", position: "relative" }}>
    <div style={{ aspectRatio: "16 / 9", width: "100%", overflow: "hidden", position: "relative" }}>
      <img src={image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.10)" }} />
      <div className="home-craft-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="#1C2E1E"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg></div>
    </div>
  </VideoButton>;
}
function MainVideo() {
  const { t } = useTranslation();
  return <VideoButton className="home-craft-thumb home-main-video" label={t("home.craft.mainVideo.ariaLabel")} style={{ display: "block", textDecoration: "none", borderRadius: 12, overflow: "hidden", position: "relative", maxWidth: 820, marginInline: "auto" }}>
    <div style={{ aspectRatio: "16 / 9", width: "100%", position: "relative" }}>
      <img src={STORAGE + "spots%20zen%20video%20presentation%20globale.png"} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.40))" }} />
      <div className="home-craft-play" aria-hidden="true" style={{ width: 72, height: 72, background: "rgba(255,255,255,0.90)" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="#1C2E1E"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg></div>
      <span style={{ position: "absolute", bottom: 16, left: 16, color: "#FFFFFF", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("home.craft.mainVideo.cta")}</span>
      <span style={{ position: "absolute", bottom: 16, right: 16, color: "#FFFFFF", fontSize: 11, fontWeight: 600 }}>02:00</span>
    </div>
  </VideoButton>;
}

function Phones() {
  const { t } = useTranslation();
  return <div className="home-phones" aria-label={t("home.concept.phones.ariaLabel")}>
    <div className="home-phone home-phone-catalog">
      <div className="home-phone-screen"><img className="home-phone-capture" src={pwaLibrary} alt={t("home.concept.phones.library.alt")} loading="lazy" width={780} height={1688} /></div>
    </div>
    <div className="home-phone home-phone-player"><div className="home-phone-screen"><img className="home-phone-capture" src={pwaPlayer} alt={t("home.concept.phones.player.alt")} loading="lazy" width={780} height={1688} /></div></div>
  </div>;
}

export function HomePage() {
  const { t } = useTranslation();

  return <div className="sz-home">
    <HomeHeader />

    <main>
      <section className="home-hero"><img className="home-hero-image" src={forestLake} alt={t("home.hero.img.alt")} width={1920} height={1088} fetchPriority="high" /><div className="home-hero-shade" />
        <div className="home-hero-content"><Picto light /><Eyebrow>{t("home.hero.eyebrow")}</Eyebrow><h1>{t("home.hero.h1")}</h1><p>{t("home.hero.copy")}</p><Cta href="/professionnels">{t("home.hero.cta.pro")}</Cta><Link className="home-hero-link" to="/offres">{t("home.hero.cta.perso")} <ArrowRight aria-hidden="true" /></Link></div>
        <a className="home-scroll" href="#concept">{t("home.hero.scroll")}<span /></a>
      </section>

      <section className="home-section home-concept home-container" id="concept"><div><Picto /><Eyebrow>{t("home.concept.eyebrow")}</Eyebrow><h2>{t("home.concept.h2")}</h2><div className="home-prose"><p>{t("home.concept.p1")}</p><p>{t("home.concept.p2")}</p><p>{t("home.concept.p3")}</p></div><div className="home-signature-line" /><strong className="home-concept-note">{t("home.concept.note")}</strong></div><Phones /></section>

      <section className="home-section home-container home-craft"><div className="home-section-heading"><Picto /><Eyebrow>{t("home.craft.eyebrow")}</Eyebrow><h2>{t("home.craft.h2")}</h2><p className="home-craft-intro">{t("home.craft.intro")}</p></div>
        <div className="home-craft-rows">{craft.map((item, i) => <div className={`home-craft-row ${i % 2 ? "home-craft-reverse" : ""}`} key={item.label}><div className="home-craft-copy"><span className="home-number">0{i + 1} / 03</span><Eyebrow>{t(`home.craft.items.${i}.eyebrow`)}</Eyebrow><h3>{t(`home.craft.items.${i}.title`)} <em>{t(`home.craft.items.${i}.italic`)}</em></h3><p>{t(`home.craft.items.${i}.text`)}</p><div className="home-author"><span /> <strong>{item.name}</strong><span className="home-author-role">{t(`home.craft.items.${i}.role`)}</span></div></div><CraftThumb title={`${t(`home.craft.items.${i}.title`)} ${t(`home.craft.items.${i}.italic`).replace(/\.$/, "")}`} image={item.thumb} time={item.time} /></div>)}</div>
        <blockquote className="home-quote"><span className="home-quote-mark">❝</span><p>{t("home.craft.quote.text")}</p><Eyebrow>{t("home.craft.quote.eyebrow")}</Eyebrow></blockquote>
      </section>

      <section className="home-section home-container" id="bienfaits"><div className="home-section-heading"><Eyebrow>{t("home.benefits.eyebrow")}</Eyebrow><h2>{t("home.benefits.h2")}</h2></div><div className="home-benefits">{benefits.map(({ Icon, title, text }, i) => <article key={title} className="home-benefit"><div><Icon aria-hidden="true" /><span>0{i + 1}</span></div><h3>{t(`home.benefits.items.${i}.title`)}</h3><p>{t(`home.benefits.items.${i}.text`)}</p></article>)}</div></section>

      <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>{t("home.video.eyebrow")}</Eyebrow><h2>{t("home.video.h2")}</h2></div><MainVideo /></section>

      <section className="home-section home-container" id="bibliotheque"><div className="home-section-heading"><Eyebrow>{t("home.lib.eyebrow")}</Eyebrow><h2>{t("home.lib.h2")}</h2><p>{t("home.lib.subtitle")}</p></div><div className="home-audios">{audios.map(({ title, moment, duration, image, Icon }, i) => <Link to="/offres" className="home-audio" key={title}><div className="home-audio-image"><img src={image} alt={title} width={400} height={300} loading="lazy" /><span><Icon aria-hidden="true" /></span></div><div className="home-audio-moment"><span>{t(`home.lib.moments.${moment}`)}</span><span>0{i + 1}</span></div><h3>{title}</h3><p><Headphones aria-hidden="true" />{duration}</p></Link>)}</div><p className="home-catalog-stats">{t("home.lib.stats")}</p></section>

      {SHOW_REVIEWS && <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>{t("home.reviews.biz.eyebrow")}</Eyebrow><h2>{t("home.reviews.biz.h2")}</h2></div><div className="home-business-reviews">{businessReviews.map(review => <blockquote key={review.name}><span className="home-quote-mark">❝</span><p>{review.text}</p><footer><strong>{review.name}</strong><span>{review.place}</span></footer></blockquote>)}</div></section>}

      {SHOW_REVIEWS && <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>{t("home.reviews.perso.eyebrow")}</Eyebrow><h2>{t("home.reviews.perso.h2")}</h2></div><div className="home-personal-reviews">{personalReviews.map(review => <blockquote key={review.name}><span className="home-stars" aria-label="5 étoiles">★★★★★</span><p>{review.text}</p><footer><strong>— {review.name}</strong><span>{review.place}</span></footer></blockquote>)}</div></section>}

      <section className="home-section home-offers" id="etablissements"><div className="home-container"><div className="home-section-heading"><h2>{t("home.offers.h2")}</h2></div><div className="home-offer-grid"><article className="home-offer"><Eyebrow>{t("home.offers.pro.eyebrow")}</Eyebrow><h3>{t("home.offers.pro.h3")}</h3><p>{t("home.offers.pro.text")}</p><span className="home-badge">{t("home.offers.pro.badge")}</span><Cta href="mailto:bonjour@spotszen.fr?subject=Tester%20Spots%20Zen%20gratuitement">{t("home.offers.pro.cta")}</Cta><small>{t("home.offers.pro.note")}</small></article><article className="home-offer"><Eyebrow>{t("home.offers.perso.eyebrow")}</Eyebrow><h3>{t("home.offers.perso.h3")}</h3><p>{t("home.offers.perso.text")}</p><div className="home-price"><span>5€</span><span>{t("home.offers.perso.perMonth")} <span>{t("home.offers.perso.orYear")}</span></span></div><span className="home-badge">{t("home.offers.perso.badge")}</span><Cta to="/offres">{t("home.offers.perso.cta")}</Cta><small>{t("home.offers.perso.note")}</small></article></div></div></section>

      <section className="home-section home-container home-contact" id="contact"><div className="home-contact-photo"><img src={forestLake} alt={t("home.contact.img.alt")} loading="lazy" width={640} height={580} /><span>{t("home.contact.overImg")}</span></div><div className="home-contact-copy"><Eyebrow>{t("home.contact.eyebrow")}</Eyebrow><h2>{t("home.contact.h2")}</h2><p>{t("home.contact.body")}</p><div className="home-identity"><span>N</span><div><strong>Ninon Godin</strong><small>{t("home.contact.role")}</small></div></div><a className="home-email" href="mailto:bonjour@spotszen.fr">bonjour@spotszen.fr</a><Cta href="mailto:bonjour@spotszen.fr?subject=Prendre%20rendez-vous">{t("home.contact.cta")}</Cta></div></section>
    </main>

    <HomeFooter />
  </div>;
}