import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Moon, Wind, Sun, Users, Sparkles, Mic, Music, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHeader, HomeFooter } from "@/components/home-chrome";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/particuliers-hero.jpg";
import pwaRecommended from "@/assets/pwa-recommande.png";
import pwaVoice from "@/assets/pwa-choix-voix.png";
import pwaPlayer from "@/assets/pwa-player.png";

const STORAGE = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/";
const monthlyLink = import.meta.env['VITE_STRIPE_MONTHLY_LINK'] as string | undefined;
const annualLink = import.meta.env['VITE_STRIPE_ANNUAL_LINK'] as string | undefined;
const catalogue = [
  { title: "Le Réveil du corps", moment: "MATIN", duration: "12min", match: "reveil-du-corps" },
  { title: "La Sieste réparatrice", moment: "JOURNÉE", duration: "15min", match: "sieste-reparatrice" },
  { title: "Glisser vers le sommeil", moment: "SOIR", duration: "18min", match: "glisser-vers-le-sommeil" },
  { title: "Respiration Niveau 1", moment: "TOUS MOMENTS", duration: "8min", match: "respiration-niveau-1" },
  { title: "Songe du soir — Orage", moment: "SOIR", duration: "22min", match: "songe-du-soir-orage" },
  { title: "Au bord du lac", moment: "TOUS MOMENTS", duration: "10min", match: "au-bord-du-lac" },
  { title: "Le Voyage dans les étoiles", moment: "NUIT · ENFANTS", duration: "25min", match: "voyage-dans-les-etoiles" },
  { title: "La Respiration du ballon", moment: "ENFANTS", duration: "7min", match: "ballon" },
];
const benefits = [
  { badge: "SOMMEIL", Icon: Moon, title: "Un sommeil plus profond", text: "Laissez les pensées de la journée se dissoudre et retrouvez un repos réparateur." },
  { badge: "STRESS", Icon: Wind, title: "Moins d'anxiété, plus de calme", text: "Quelques minutes de guidance pour desserrer la pression et revenir pleinement à vous-même." },
  { badge: "CONCENTRATION", Icon: Sun, title: "L'esprit clair au bon moment", text: "Faites de la place à la clarté : avant une réunion, entre deux tâches, ou quand vous en avez besoin." },
  { badge: "FAMILLE", Icon: Users, title: "Des moments à partager", text: "Des immersions pensées pour tous les âges, à écouter seul ou en famille, sans aucune friction." },
];
const steps = [
  { title: "L'heure détectée", text: "Spots Zen détecte l'heure de votre connexion et met en avant l'immersion qui correspond à ce moment : le matin, l'après-midi, le soir ou la nuit." },
  { title: "La voix choisie", text: "Féminine ou masculine : vous choisissez celle qui vous touche." },
  { title: "L'écran verrouillé", text: "L'audio continue même quand votre écran se verrouille. Posez votre téléphone. Fermez les yeux. Laissez-vous guider." },
];
const craft = [
  { Icon: Sparkles, title: "Les Techniques", text: "Les scénarios s'appuient sur l'hypnose éricksonienne, le yoga nidra et la cohérence cardiaque. Chaque mot est choisi pour l'écho qu'il produit dans le corps et ainsi créer la sensation recherchée.", signature: "Ninon Godin · Professeure de yoga · Fondatrice", image: "ninon", time: 118, label: "01 — LES TECHNIQUES" },
  { Icon: Mic, title: "Les Voix", text: "Comédien depuis 40 ans. Voix française connue (Bruce Willis, Bryan Cranston…). Des textes incarnés, pas récités.", signature: "Stefan Godin · Comédien professionnel", image: "stefan", time: 75, label: "02 — LES VOIX" },
  { Icon: Music, title: "La Musique", text: "Des compositions originales avec fréquences binaurales. Des sons captés à Lacanau (la pluie, l'orage, l'eau…). Des immersions complètes.", signature: "Benoît Courti · Musicien Compositeur", image: "musique", time: 50, label: "03 — LA MUSIQUE" },
];
const reviews = [
  { text: "J'ai enfin trouvé un rituel pour me poser le soir. La voix, la musique… tout m'aide à vraiment décrocher. Je dors tellement mieux.", name: "Sophie", role: "Médecin · Paris" },
  { text: "Mon fils réclame La Respiration du ballon avant de dormir. C'est devenu notre rituel du soir et il s'endort en cinq minutes.", name: "Laure", role: "Maman · Lyon" },
  { text: "Quelques minutes entre deux réunions et je me retrouve. Discret, efficace, et franchement agréable à écouter.", name: "Pierre", role: "Responsable marketing · Bordeaux" },
  { text: "La qualité de la production est remarquable. On sent que c'est fait avec soin, pas avec une IA. Ça change tout.", name: "Manon", role: "Coach bien-être · Nantes" },
];
const faq = [
  { question: "Comment accéder aux audios après mon inscription ?", answer: "Dès votre abonnement, vous recevez un accès immédiat à la bibliothèque Spots Zen. Tout fonctionne depuis votre navigateur, aucun téléchargement nécessaire." },
  { question: "La qualité audio est-elle vraiment professionnelle ?", answer: "Absolument. Chaque immersion est enregistrée en français en studio par des professionnels, avec une musique originale composée sur mesure." },
  { question: "Y a-t-il des audios adaptés aux enfants ?", answer: "Oui. Plusieurs immersions sont conçues pour les 4-12 ans, avec des voix douces et des thèmes accessibles. La Respiration du ballon en est un bon exemple." },
  { question: "Comment résilier mon abonnement ?", answer: "Vous pouvez résilier à tout moment depuis votre espace, sans frais ni délai de préavis. Votre accès reste actif jusqu'à la fin de la période payée." },
];
function Heading({ eyebrow, children, subtitle }: { eyebrow: string; children: ReactNode; subtitle?: string }) {
  return <div className="p-heading"><p className="p-eyebrow">{eyebrow}</p><h2>{children}</h2>{subtitle && <p>{subtitle}</p>}</div>;
}
function Cta({ children, annual = false, variant = "", arrow = false }: { children: ReactNode; annual?: boolean; variant?: string; arrow?: boolean }) {
  const href = annual ? annualLink : monthlyLink;
  return href ? <Button asChild className={`p-cta ${variant}`}><a href={href}>{children}{arrow && <ArrowRight aria-hidden />}</a></Button> : <Button asChild className={`p-cta ${variant}`}><Link to="/offres">{children}{arrow && <ArrowRight aria-hidden />}</Link></Button>;
}
function VideoThumb({ image, time, label, main = false }: { image: string; time?: number; label?: string; main?: boolean }) {
  return <a className={`p-thumb ${main ? "p-main-thumb" : ""}`} href={`https://youtu.be/41lpqo0Bun4${time ? `?t=${time}` : ""}`} target="_blank" rel="noopener noreferrer" aria-label={`Voir la vidéo : ${label ?? "Présentation Spots Zen"} (ouvre YouTube)`}><img src={image} alt="" loading="lazy" width={720} height={405} /><span className="p-play"><Play size={20} fill="currentColor" aria-hidden /></span>{label && <span className="p-thumb-label">{label}</span>}</a>;
}
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function ParticuliersPage() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.from("audios").select("slug,titre_fr,image_url").eq("statut", "publié").then(({ data }) => {
      const next: Record<string, string> = {};
      for (const item of catalogue) {
        const audio = data?.find(row => normalize(`${row.slug ?? ""} ${row.titre_fr ?? ""}`).includes(item.match) && row.image_url);
        if (audio?.image_url) next[item.match] = audio.image_url;
      }
      if (active) setImages(next);
    });
    return () => { active = false; };
  }, []);
  return <div className="sz-home sz-particuliers"><HomeHeader anchorPrefix="/" /><main>
    <section className="p-hero"><img className="p-hero-image" src={hero} alt="Une femme face à l'océan au crépuscule" width={1920} height={1088} fetchPriority="high" /><div className="p-hero-shade" /><div><p className="p-eyebrow">LA BIBLIOTHÈQUE SPOTS ZEN</p><h1>Le bon audio,<br /><em>au bon moment.</em></h1><p className="p-hero-copy">Sommeil, concentration, gestion du stress : des immersions guidées par des voix enveloppantes humaines et des musiques originales. Partout avec vous.</p><Cta arrow>Je commence gratuitement</Cta><p className="p-small-note">Premier mois offert · Sans engagement</p></div></section>
    <section className="p-section p-alt"><p className="p-video-title">Deux minutes pour tout comprendre.</p><VideoThumb main image={STORAGE + "spots%20zen%20video%20presentation%20globale.png"} /></section>
    <section className="p-section"><div className="p-inner"><Heading eyebrow="CE QUE VOUS ALLEZ RESSENTIR" subtitle="Des immersions pensées pour vos besoins, au bon moment de votre journée.">Une pause qui<br /><em>change tout.</em></Heading><div className="p-grid-two">{benefits.map(({ badge, Icon, title, text }) => <article className="p-benefit" key={badge}><span className="p-badge">{badge}</span><Icon aria-hidden /><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="p-section p-alt"><div className="p-inner"><Heading eyebrow="COMMENT ÇA MARCHE">Simple comme<br /><em>une respiration.</em></Heading><div className="p-steps">{steps.map(({ title, text }, i) => <div className="p-step" key={title}><span className="p-step-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div><p className="p-child-note">Et pour les enfants, des immersions douces sont aussi pensées pour eux ! Proposez-leur l'histoire du soir Le Voyage dans les étoiles et l'exercice de respiration La Respiration du ballon.</p><PwaScreens /></div></section>
    <section className="p-section"><div className="p-inner"><Heading eyebrow="LA BIBLIOTHÈQUE" subtitle="Des audios pour chaque moment de la journée · Des musiques composées sur mesure avec fréquences binaurales · Le choix entre voix féminine et masculine"><em>Des audios qui vous plongent en immersion complète pour une relaxation profonde.</em></Heading><div className="p-catalogue">{catalogue.map(item => <article className="p-audio" key={item.title}>{images[item.match] && <img src={images[item.match]} alt="" loading="lazy" width={400} height={300} />}<div className="p-audio-badges"><span>{item.moment}</span><span>{item.duration}</span><span className="p-subscriber">Abonné·e</span></div><h3>{item.title}</h3></article>)}</div></div></section>
    <section className="p-section p-dark"><div className="p-inner"><Heading eyebrow="LE SAVOIR-FAIRE SPOTS ZEN" subtitle="Du premier mot jusqu'à la dernière note : une attention portée à chaque détail.">Chaque immersion,<br /><em>une exigence.</em></Heading><div className="p-craft-grid">{craft.map(({ Icon, title, text, signature, image, time, label }) => <article key={title}><span className="p-craft-icon"><Icon size={22} aria-hidden /></span><h3>{title}</h3><p>{text}</p><p className="p-signature">{signature}</p><VideoThumb image={STORAGE + `spots%20zen%20extrait%20video%20${image}.png`} time={time} label={label} /></article>)}</div></div></section>
    <section className="p-section p-alt"><div className="p-inner"><Heading eyebrow="ILS ONT PRIS LE TEMPS">Leurs <em>mots.</em></Heading><div className="p-grid-two">{reviews.map(({ text, name, role }) => <blockquote className="p-review" key={name}><span className="p-stars" aria-label="5 étoiles">★★★★★</span><p>« {text} »</p><footer>— <strong>{name}</strong> · {role}</footer></blockquote>)}</div></div></section>
    <section className="p-section p-dark"><div className="p-inner"><Heading eyebrow="TARIFS">Ce soir, retrouvez votre sérénité.</Heading><div className="p-prices p-grid-two"><article className="p-price-card"><p className="p-price-label">MENSUEL</p><div className="p-price">€ <span>5</span></div><p className="p-price-sub">par mois · sans engagement</p><p>Premier mois offert. Résiliation en un clic.</p><Cta variant="p-ghost">Commencer gratuitement</Cta></article><article className="p-price-card p-annual"><span className="p-best">MEILLEURE OFFRE</span><p className="p-price-label">ANNUEL</p><div className="p-price">€ <span>49</span></div><p className="p-price-sub">par an · soit 4€/mois · 2 mois offerts</p><p>2 mois offerts. La sérénité tout au long de l'année. Prélèvement en une fois.</p><Cta annual>Commencer · meilleure offre</Cta></article></div><p className="p-price-legend">Moins qu'un café par semaine. Offre de lancement · Tarif garanti à vie pour les premiers abonnés.</p></div></section>
    <section className="p-section"><Heading eyebrow="QUESTIONS FRÉQUENTES">Tout ce que<br /><em>vous vous demandez.</em></Heading><div className="p-faq">{faq.map(({ question, answer }, i) => <div className="p-faq-item" key={question}><Button variant="ghost" className="p-faq-question" id={`p-faq-question-${i}`} aria-expanded={openFaq === i} aria-controls={`p-faq-answer-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{question}<Plus aria-hidden /></Button><div className="p-faq-answer" id={`p-faq-answer-${i}`} role="region" aria-labelledby={`p-faq-question-${i}`} hidden={openFaq !== i}>{answer}</div></div>)}</div></section>
    <section className="p-section p-dark p-final"><img className="p-final-picto" src={STORAGE + "SpotsZen-picto-vert.png"} alt="" /><Heading eyebrow="COMMENCEZ CE SOIR" subtitle="À partir de 5€/mois, accédez à une bibliothèque pensée pour vous. Premier mois offert.">Offrez-vous<br /><em>une vraie pause.</em></Heading><Cta variant="p-white" arrow>Commencer maintenant</Cta><p className="p-small-note">Premier mois offert · Sans engagement · Résiliez quand vous voulez</p><Link to="/" hash="etablissements" className="p-business-link">Vous êtes un établissement ? Pour mon établissement →</Link></section>
  </main><HomeFooter anchorPrefix="/" /></div>;
}

function PwaScreens() {
  return <div className="p-phones" aria-label="Aperçu réel de l'expérience Spots Zen"><figure className="p-phone"><img src={pwaRecommended} alt="Le haut de la page spot avec l'audio recommandé selon l'heure" loading="lazy" width={780} height={1688} /></figure><figure className="p-phone"><img src={pwaVoice} alt="L'écran de choix entre voix féminine et masculine" loading="lazy" width={780} height={1688} /></figure><figure className="p-phone"><img src={pwaPlayer} alt="Le lecteur Spots Zen pendant une écoute" loading="lazy" width={780} height={1688} /></figure></div>;
}