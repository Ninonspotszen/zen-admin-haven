import { type ReactNode } from "react";
import { HomeHeader, HomeFooter } from "@/components/home-chrome";
import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, ChevronDown, Menu, X, Moon, Heart, Sun, Wind, Clock3, UsersRound, Headphones, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoButton } from "@/components/video-modal";
import forestLake from "@/assets/home-forest-lake.jpg";
import sunsetLake from "@/assets/home-sunset-lake.jpg";
import pwaLibrary from "@/assets/pwa-bibliotheque.png";
import pwaPlayer from "@/assets/pwa-player.png";

const STORAGE = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/";
const LOGO = STORAGE + "SpotsZen-logo-transparent-fonce.png";
const LOGO_LIGHT = STORAGE + "SpotsZen-logo-transparent-clair.png";
const PICTO = STORAGE + "SpotsZen-picto-vert.png";
const LANGS = ["fr", "en", "de", "nl", "es"];
const audios = [
  { moment: "MATIN", title: "Le Réveil du corps", duration: "12 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20reveil%20du%20corps.jpg", Icon: Sun },
  { moment: "JOURNÉE", title: "La Sieste réparatrice", duration: "15 min", image: STORAGE + "spots%20zen%20meditation%20guidee%20%20sommeil%20sieste%20reparatrice.jpg", Icon: Wind },
  { moment: "SOIR", title: "Glisser vers le sommeil", duration: "18 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20glisser%20vers%20le%20sommeil.jpg", Icon: Moon },
  { moment: "NUIT", title: "Songe du soir — Orage", duration: "8 min", image: STORAGE + "spots%20zen%20-%20meditation%20guidee%20-%20sommeil%20-%20orage%20du%20soir.jpg", Icon: Moon },
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
  return <VideoButton className="home-craft-thumb" time={time} label={`Voir l'extrait : ${title}`} style={{ display: "block", textDecoration: "none", color: "inherit", borderRadius: 12, overflow: "hidden", position: "relative" }}>
    <div style={{ aspectRatio: "16 / 9", width: "100%", overflow: "hidden", position: "relative" }}>
      <img src={image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.10)" }} />
      <div className="home-craft-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="#1C2E1E"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg></div>
    </div>
  </VideoButton>;
}
function MainVideo() {
  return <VideoButton className="home-craft-thumb home-main-video" label="Voir la vidéo de présentation Spots Zen" style={{ display: "block", textDecoration: "none", borderRadius: 12, overflow: "hidden", position: "relative", maxWidth: 820, marginInline: "auto" }}>
    <div style={{ aspectRatio: "16 / 9", width: "100%", position: "relative" }}>
      <img src={STORAGE + "spots%20zen%20video%20presentation%20globale.png"} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.40))" }} />
      <div className="home-craft-play" aria-hidden="true" style={{ width: 72, height: 72, background: "rgba(255,255,255,0.90)" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="#1C2E1E"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg></div>
      <span style={{ position: "absolute", bottom: 16, left: 16, color: "#FFFFFF", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>DÉCOUVRIR L'EXPÉRIENCE</span>
      <span style={{ position: "absolute", bottom: 16, right: 16, color: "#FFFFFF", fontSize: 11, fontWeight: 600 }}>02:00</span>
    </div>
  </VideoButton>;
}

function Phones() {
  return <div className="home-phones" aria-label="Aperçu de la bibliothèque et du lecteur Spots Zen">
    <div className="home-phone home-phone-catalog">
      <div className="home-phone-screen"><img className="home-phone-capture" src={pwaLibrary} alt="La bibliothèque réelle Spots Zen avec les audios disponibles" loading="lazy" width={780} height={1688} /></div>
    </div>
    <div className="home-phone home-phone-player"><div className="home-phone-screen"><img className="home-phone-capture" src={pwaPlayer} alt="Le lecteur réel Spots Zen en cours de lecture" loading="lazy" width={780} height={1688} /></div></div>
  </div>;
}

export function HomePage() {

  return <div className="sz-home">
    <HomeHeader />

    <main>
      <section className="home-hero"><img className="home-hero-image" src={forestLake} alt="Un lac paisible entouré de forêts, reflétant le ciel" width={1920} height={1088} fetchPriority="high" /><div className="home-hero-shade" />
        <div className="home-hero-content"><Picto light /><Eyebrow>LE BIEN-ÊTRE À PORTÉE DE MAIN</Eyebrow><h1>Et si votre espace offrait<br className="home-desktop-break" /> une vraie pause bien-être ?</h1><p>Un QR code dans votre espace. Vos visiteurs accèdent en deux secondes à une<br className="home-desktop-break" /> bibliothèque d'immersions audio bien-être.</p><Cta href="#etablissements">Pour mon établissement</Cta><Link className="home-hero-link" to="/offres">Vous êtes un particulier ? Commencer à 5€/mois <ArrowRight aria-hidden="true" /></Link></div>
        <a className="home-scroll" href="#concept">FAITES DÉFILER<span /></a>
      </section>

      <section className="home-section home-concept home-container" id="concept"><div><Picto /><Eyebrow>UNE NOUVELLE FAÇON DE FAIRE UNE PAUSE</Eyebrow><h2>Les bons audios,<br />au bon moment,<br /><em>au bon endroit.</em></h2><div className="home-prose"><p>En pause. En vacances. Loin du quotidien. Certains moments de la journée n'attendent qu'une chose : qu'on leur fasse de la place.</p><p>Spots Zen est né pour eux. Une bibliothèque resserrée d'immersions audio bien-être, accessible là où ses utilisateurs sont déjà.</p><p>L'audio s'adapte à l'heure de votre connexion pour vous guider dans l'énergie du moment. Pour vous, pour vos enfants, vos clients ou vos collaborateurs.</p></div><div className="home-signature-line" /><strong className="home-concept-note">Une expérience pensée pour vos visiteurs.</strong></div><Phones /></section>

      <section className="home-section home-container home-craft"><div className="home-section-heading"><Picto /><Eyebrow>LE SAVOIR-FAIRE SPOTS ZEN</Eyebrow><h2>Chaque immersion est le résultat<br />d'une <em>chaîne d'exigence.</em></h2><p className="home-craft-intro">Quand on se lance enfin dans un audio, la voix ne doit pas sonner faux. L'état de détente recherché est fragile : un son de mauvaise qualité ou un écran qui se verrouille, et tout s'effondre avant même d'avoir commencé. C'est précisément ce que Spots Zen a décidé de ne jamais laisser arriver. Des textes écrits à la main, des voix enregistrées en studio, une musique composée sur mesure, des techniques qui font leurs preuves depuis des décennies. Pour créer des expériences qui font vraiment du bien.</p></div>
        <div className="home-craft-rows">{craft.map((item, i) => <div className={`home-craft-row ${i % 2 ? "home-craft-reverse" : ""}`} key={item.label}><div className="home-craft-copy"><span className="home-number">0{i + 1} / 03</span><Eyebrow>{item.eyebrow}</Eyebrow><h3>{item.title}<br /><em>{item.italic}</em></h3><p>{item.text}</p><div className="home-author"><span /> <strong>{item.name}</strong><span className="home-author-role">{item.role}</span></div></div><CraftThumb title={item.title + " " + item.italic.slice(0, -1)} image={item.thumb} time={item.time} /></div>)}</div>
        <blockquote className="home-quote"><span className="home-quote-mark">❝</span><p>« Les scénarios s'appuient sur des techniques puissantes reconnues de relaxation. Nos voix sont enregistrées en studio et chaque musique est composée sur mesure pour donner à ces moments toute leur profondeur. »</p><Eyebrow>L'EXIGENCE DERRIÈRE CHAQUE ÉCOUTE</Eyebrow></blockquote>
      </section>

      <section className="home-section home-container" id="bienfaits"><div className="home-section-heading"><Eyebrow>PRENDRE SOIN DE SOI, SIMPLEMENT</Eyebrow><h2>Les bénéfices dès<br /><em>la première écoute.</em></h2></div><div className="home-benefits">{benefits.map(({ Icon, title, text }, i) => <article key={title} className="home-benefit"><div><Icon aria-hidden="true" /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>EN IMAGES</Eyebrow><h2>Découvrez Spots Zen<br /><em>en deux minutes.</em></h2></div><MainVideo /></section>

      <section className="home-section home-container" id="bibliotheque"><div className="home-section-heading"><Eyebrow>LA BIBLIOTHÈQUE</Eyebrow><h2>Le bon audio, <em>au bon moment.</em></h2><p>Une expérience qui s'accorde à vos envies et au rythme de votre journée.</p></div><div className="home-audios">{audios.map(({ title, moment, duration, image, Icon }, i) => <Link to="/offres" className="home-audio" key={title}><div className="home-audio-image"><img src={image} alt={title} width={400} height={300} loading="lazy" /><span><Icon aria-hidden="true" /></span></div><div className="home-audio-moment"><span>{moment}</span><span>0{i + 1}</span></div><h3>{title}</h3><p><Headphones aria-hidden="true" />{duration}</p></Link>)}</div><p className="home-catalog-stats">8 immersions guidées <span>·</span> voix féminine ou masculine <span>·</span> 8 musiques composées sur mesure <span>·</span> 24 écoutes différentes possibles</p></section>

      <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>ILS NOUS FONT CONFIANCE</Eyebrow><h2>Ils l'ont <em>déployé.</em></h2></div><div className="home-business-reviews">{businessReviews.map(review => <blockquote key={review.name}><span className="home-quote-mark">❝</span><p>{review.text}</p><footer><strong>{review.name}</strong><span>{review.place}</span></footer></blockquote>)}</div></section>

      <section className="home-section home-container"><div className="home-section-heading"><Eyebrow>ILS ONT PRIS LE TEMPS</Eyebrow><h2>Leurs <em>mots.</em></h2></div><div className="home-personal-reviews">{personalReviews.map(review => <blockquote key={review.name}><span className="home-stars" aria-label="5 étoiles">★★★★★</span><p>{review.text}</p><footer><strong>— {review.name}</strong><span>{review.place}</span></footer></blockquote>)}</div></section>

      <section className="home-section home-offers" id="etablissements"><div className="home-container"><div className="home-section-heading"><h2>Pour vous ou pour votre établissement :<br />Spots Zen s'adapte à vous !</h2></div><div className="home-offer-grid"><article className="home-offer"><Eyebrow>POUR LES ÉTABLISSEMENTS</Eyebrow><h3>Votre espace mérite<br /><em>une pause bien-être.</em></h3><p>Offrez à vos visiteurs une attention qu'ils n'oublieront pas. Un simple QR code, une expérience qui fait la différence.</p><span className="home-badge">✦ 2 mois offerts — sans engagement, sans installation</span><Cta href="mailto:bonjour@spotszen.fr?subject=Tester%20Spots%20Zen%20gratuitement">Tester gratuitement</Cta><small>Opérationnel en 48h. Plusieurs langues disponibles.</small></article><article className="home-offer"><Eyebrow>VOTRE RENDEZ-VOUS AVEC VOUS-MÊME</Eyebrow><h3>La pause que<br />vous vous promettiez.</h3><p>Une bibliothèque d'immersions pour retrouver le calme quand vous en avez besoin. À votre rythme, partout avec vous.</p><div className="home-price"><span>5€</span><span>par mois <span>ou 49€ par an</span></span></div><span className="home-badge">✦ 1 mois offert — annulez quand vous voulez</span><Cta to="/offres">Commencer gratuitement</Cta><small>5€/mois ensuite · Tarif garanti à vie pour les premiers abonnés.</small></article></div></div></section>

      <section className="home-section home-container home-contact" id="contact"><div className="home-contact-photo"><img src={forestLake} alt="Un lac au calme, entouré de pins" loading="lazy" width={640} height={580} /><span>PRENONS LE TEMPS D'ÉCHANGER</span></div><div className="home-contact-copy"><Eyebrow>UN PROJET, UNE QUESTION, UNE IDÉE ?</Eyebrow><h2>On en parle<br /><em>de vive voix ?</em></h2><p>Chaque lieu est différent. Racontez-moi le vôtre, et imaginons ensemble comment y faire une place au bien-être.</p><div className="home-identity"><span>N</span><div><strong>Ninon Godin</strong><small>Fondatrice de Spots Zen</small></div></div><a className="home-email" href="mailto:bonjour@spotszen.fr">bonjour@spotszen.fr</a><Cta href="mailto:bonjour@spotszen.fr?subject=Prendre%20rendez-vous">Prendre rendez-vous</Cta></div></section>
    </main>

    <HomeFooter />
  </div>;
}