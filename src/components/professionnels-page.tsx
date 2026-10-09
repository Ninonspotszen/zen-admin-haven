import { useState, type FormEvent, type ReactNode } from "react";
import { Zap, Mic, Globe, RefreshCw, TrendingUp, AlertCircle, Check } from "lucide-react";
import { HomeHeader, HomeFooter } from "@/components/home-chrome";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/pro-hero.jpg";
import imgHeb from "@/assets/pro-hebergements.jpg";
import imgEnt from "@/assets/pro-entreprises.jpg";
import imgEco from "@/assets/pro-ecoles.jpg";
import imgSan from "@/assets/pro-sante.jpg";
import imgCol from "@/assets/pro-collectivites.jpg";
import pwaRecommended from "@/assets/pwa-recommande.png";
import pwaPlayer from "@/assets/pwa-player.png";

type Field = { name: "nom" | "email" | "etablissement" | "type_structure" | "taille" | "message"; label: string; type?: "text" | "email" | "select" | "textarea"; options?: string[] };
type Sector = { id: string; tab: string; chip: string; sub: string; title: string; body: string; list: string[]; image: string; formTitle: string; fields: Field[]; legal?: boolean };

const SUCCESS = "✓ Message envoyé ! Nous vous répondons sous 24 heures. À très vite.";
const msg: Field = { name: "message", label: "Message", type: "textarea" };

const sectors: Sector[] = [
  { id: "hebergements", tab: "Hébergements", chip: "HÉBERGEMENTS TOURISTIQUES", sub: "Hôtel · Camping · Maison d’hôtes · Gîte · Bateau de croisière", title: "Faites de votre établissement un lieu dont on se souvient.", body: "Vos clients ont choisi de venir chez vous pour déconnecter, ralentir, respirer différemment. Spots Zen transforme cette intention en expérience immersive et émotionnelle dont ils se souviendront. Un QR code discret dans leur chambre ou dans vos espaces communs.", list: ["Bibliothèque d’audios pour tous les moments", "Accès immédiat via QR code sans compte", "Interface multilingue", "Audios personnalisés à votre lieu", "Événements bien-être ponctuels sur site"], image: imgHeb, formTitle: "Parlons de votre projet d’hébergement touristique",
    fields: [{ name: "etablissement", label: "Nom de votre établissement" }, { name: "type_structure", label: "Type d’hébergement", type: "select", options: ["Hôtel", "Camping", "Maison d’hôtes", "Gîte", "Bateau de croisière", "Autre"] }, { name: "taille", label: "Nombre de chambres / logements" }, msg] },
  { id: "entreprises", tab: "Entreprises", chip: "ENTREPRISES", sub: "Grands groupes · PME · Startups · Organisations publiques", title: "Donnez à vos collaborateurs les outils pour leur bien-être.", body: "La qualité du sommeil, la gestion des émotions et la capacité à décompresser sont des compétences qui se cultivent au quotidien. Spots Zen donne à vos équipes un accès simple, discret et immédiat à des audios de bien-être, utilisables depuis le bureau, la salle de repos, le domicile ou en déplacement. En entreprise comme en télétravail, ça fonctionne.", list: ["Bibliothèque stress, sommeil et pleine conscience", "Accès par email professionnel", "Multilingue", "Audios personnalisés aux couleurs de votre entreprise", "Conférences et ateliers sur mesure"], image: imgEnt, formTitle: "Parlons de votre projet entreprise",
    fields: [{ name: "etablissement", label: "Nom de votre entreprise" }, { name: "nom", label: "Votre fonction" }, { name: "email", label: "Email professionnel", type: "email" }, { name: "taille", label: "Nombre de collaborateurs", type: "select", options: ["< 50", "50–250", "250–1 000", "> 1 000"] }, msg] },
  { id: "ecoles", tab: "Écoles", chip: "ÉCOLES & UNIVERSITÉS", sub: "Universités · Grandes écoles · BTS · IUT · Écoles de commerce et d’ingénieurs", title: "Accompagnez vos étudiants dans la gestion de leur stress.", body: "Anxiété des examens, troubles du sommeil, surcharge cognitive, isolement — la santé mentale étudiante est devenue un enjeu central. Spots Zen y répond concrètement, sans barrière d’accès. Vos étudiants se connectent avec leur email institutionnel, depuis leur téléphone, à n’importe quel moment — la veille d’un examen, après une journée chargée, ou avant de dormir.", list: ["Audios stress, sommeil et concentration examens", "Accès par email étudiant, campus et domicile", "Multilingue", "Audios personnalisés campus", "Conférences et ateliers vie étudiante"], image: imgEco, formTitle: "Parlons de votre projet pédagogique",
    fields: [{ name: "etablissement", label: "Nom de l’établissement" }, { name: "nom", label: "Votre fonction" }, { name: "email", label: "Email institutionnel", type: "email" }, { name: "taille", label: "Nombre d’étudiants", type: "select", options: ["< 500", "500–2 000", "2 000–10 000", "> 10 000"] }, msg] },
  { id: "sante", tab: "Santé", chip: "ÉTABLISSEMENTS DE SANTÉ", sub: "Cliniques · Hôpitaux · Centres de rééducation · Maternités · Centres de bien-être médical", title: "Un accompagnement non médicamenteux, accessible dès la chambre.", body: "L’anxiété préopératoire touche entre 60 et 80 % des patients. La qualité du sommeil en établissement de santé est systématiquement dégradée par l’environnement, la luminosité et le stress. Spots Zen propose un outil audio complémentaire — méditations guidées, exercices de respiration, techniques de relaxation profonde — accessibles depuis la chambre via QR code.", list: ["Audios relaxation et respiration via QR code sans compte", "Contenus adaptés aux contextes médicaux", "Audios personnalisés au parcours de soin", "Multilingue"], image: imgSan, legal: true, formTitle: "Parlons de votre projet de soin",
    fields: [{ name: "etablissement", label: "Nom de l’établissement" }, { name: "nom", label: "Votre fonction" }, { name: "email", label: "Email professionnel", type: "email" }, { name: "type_structure", label: "Type d’établissement", type: "select", options: ["Clinique privée", "Hôpital", "Centre de rééducation", "Maternité", "Centre de bien-être médical", "Autre"] }, { name: "taille", label: "Nombre de lits / chambres" }, msg] },
  { id: "collectivites", tab: "Collectivités", chip: "COLLECTIVITÉS", sub: "Communes · Communautés de communes · Offices de tourisme · Parcs naturels", title: "Faites de vos espaces publics des lieux de ressourcement.", body: "Le bien-être des habitants et des visiteurs est un enjeu de qualité de vie et d’attractivité territoriale. Spots Zen permet aux collectivités de créer des espaces de pause dans leurs lieux publics — un banc face à la mer, un coin de parc, un belvédère, une salle de médiathèque — et d’y proposer un accompagnement audio gratuit et immédiat. Un panneau discret. Un QR code. Une voix qui guide.", list: ["Bibliothèque via QR code dans les espaces publics", "Accès ouvert sans inscription", "Audios personnalisés au territoire", "Multilingue", "Événements bien-être publics"], image: imgCol, formTitle: "Parlons de votre projet de territoire",
    fields: [{ name: "etablissement", label: "Nom de la collectivité" }, { name: "nom", label: "Votre fonction" }, { name: "email", label: "Email professionnel", type: "email" }, { name: "type_structure", label: "Type", type: "select", options: ["Commune", "Communauté de communes", "Office de tourisme", "Parc naturel", "Autre"] }, { name: "taille", label: "Population concernée" }, msg] },
];

const generalFields: Field[] = [
  { name: "nom", label: "Prénom · Nom" },
  { name: "email", label: "Email professionnel", type: "email" },
  { name: "type_structure", label: "Type d’établissement", type: "select", options: ["Hébergement touristique", "Entreprise", "École", "Université", "Établissement de santé", "Commune", "Collectivité", "Autre"] },
  { name: "etablissement", label: "Nom de l’établissement" },
  { name: "taille", label: "Nombre de personnes / chambres" },
  { name: "message", label: "Message libre", type: "textarea" },
];

const steps = [
  ["Le scan", "Votre visiteur aperçoit l’affichette et scanne le QR code avec son téléphone."],
  ["L’accès immédiat", "La bibliothèque s’ouvre en deux secondes. Sans compte. Sans téléchargement. Sans aucune manipulation."],
  ["La langue détectée", "La langue de son téléphone est détectée automatiquement. Il peut la changer à tout moment."],
  ["L’audio recommandé", "Selon l’heure de connexion, l’audio le plus adapté s’affiche en premier. Il choisit sa voix : féminine ou masculine."],
  ["L’immersion", "Il écoute. Il se détend. L’audio continue même écran verrouillé."],
  ["L’impact", "Satisfaction en hausse. Bouche-à-oreille renforcé. Un argument différenciant que vos visiteurs mentionnent."],
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Heading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return <div className="pr-heading"><p className="pr-eyebrow">{eyebrow}</p><h2>{children}</h2></div>;
}

function ContactForm({ secteur, title, fields, cta, large = false }: { secteur: string; title: string; fields: Field[]; cta: string; large?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const row: Record<string, string | null> = { secteur };
    for (const f of fields) {
      const v = String(fd.get(f.name) ?? "").trim();
      row[f.name] = row[f.name] ? `${row[f.name]} · ${v}` : v || null;
    }
    setState("sending");
    const { error } = await supabase.from("contact_requests").insert(row as never);
    setState(error ? "error" : "done");
  }
  return (
    <div className={`pr-form-card ${large ? "pr-form-large" : ""}`}>
      {state === "done" ? <p className="pr-success" role="status">{SUCCESS}</p> : (
        <form onSubmit={submit}>
          <h3 className="pr-form-title">{title}</h3>
          <p className="pr-form-note">{large ? "Réponse sous 24 heures · Sans engagement" : "Réponse personnalisée sous 24 heures · Sans engagement"}</p>
          {fields.map(f => {
            const id = `${secteur}-${f.name}-${f.label.length}`;
            return <label key={id} htmlFor={id} className="pr-field"><span>{f.label}</span>
              {f.type === "textarea" ? <textarea id={id} name={f.name} maxLength={5000} />
                : f.type === "select" ? <select id={id} name={f.name} defaultValue=""><option value="" disabled>Choisir…</option>{f.options?.map(o => <option key={o}>{o}</option>)}</select>
                : <input id={id} name={f.name} type={f.type ?? "text"} maxLength={200} required={f.type === "email"} />}
            </label>;
          })}
          {state === "error" && <p className="pr-error">Une erreur est survenue. Merci de réessayer.</p>}
          <button className="pr-btn pr-btn-full" type="submit" disabled={state === "sending"}>{cta}</button>
        </form>
      )}
    </div>
  );
}

export function ProfessionnelsPage() {
  const [active, setActive] = useState("hebergements");
  const s = sectors.find(x => x.id === active)!;
  return <div className="sz-home sz-pro"><HomeHeader anchorPrefix="/" /><main>
    <section className="pr-hero">
      <img className="pr-hero-img" src={hero} alt="Chambre d’hôtel apaisante avec un grand lit" width={1920} height={1088} />
      <div className="pr-hero-shade" />
      <div className="pr-hero-inner">
        <p className="pr-eyebrow">POUR LES PROFESSIONNELS</p>
        <h1>Offrez à vos visiteurs, collaborateurs ou étudiants une immersion bien-être unique.</h1>
        <p className="pr-hero-copy">Spots Zen accompagne les entreprises, les établissements touristiques, les communes, les écoles et les structures de santé avec une bibliothèque d'audios de bien-être accessible en quelques secondes, sans application.</p>
        <div className="pr-hero-ctas"><button className="pr-btn" onClick={() => scrollTo("offre")}>Découvrir notre offre →</button><button className="pr-link" onClick={() => scrollTo("devis")}>Demander un devis</button></div>
      </div>
    </section>

    <section className="pr-section">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">POURQUOI SPOTS ZEN</p>
        <h2 className="pr-promise">Dans un monde où tout s'accélère, offrir un moment de pause n'est plus un luxe. C'est une décision stratégique.</h2>
        <p className="pr-body">Spots Zen vous permet de transformer vos espaces — qu'il s'agisse d'une chambre d'hôtel, d'une salle de repos, d'un couloir d'attente ou d'un campus — en havres de sérénité. Méditations guidées, exercices de respiration, balades sonores, musique relaxante... vos utilisateurs n'ont pas de compte à créer, rien à télécharger.</p>
        <p className="pr-quote">« Ils scannent. Ils écoutent. Ils se ressourcent. Simple pour vous. Inoubliable pour eux. »</p>
        <div className="pr-grid3">
          {[[Zap, "Accès immédiat", "Deux secondes. Aucun téléchargement. Aucun compte."], [Mic, "Audios de haute qualité", "Techniques reconnues. Voix studio. Musique composée sur mesure."], [Globe, "Multilingue", "Langue détectée automatiquement. FR / EN / DE / NL / ES."]].map(([Icon, t, d]) => { const I = Icon as typeof Zap; return <div className="pr-card" key={t as string}><I aria-hidden className="pr-icon" /><h3>{t as string}</h3><p>{d as string}</p></div>; })}
        </div>
      </div>
    </section>

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow="EN 6 ÉTAPES">Du QR code à l'immersion</Heading>
        <ol className="pr-timeline">{steps.map(([t, d], i) => <li key={t}><span className="pr-num">{String(i + 1).padStart(2, "0")}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
        <div className="pr-center"><button className="pr-btn" onClick={() => scrollTo("devis")}>Votre établissement est prêt ? Demander un devis →</button><p className="pr-note">Réponse sous 24 heures · Sans engagement</p></div>
      </div>
    </section>

    <section className="pr-section pr-dark">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">CE QUE VOS VISITEURS VOIENT</p>
        <h2>En deux secondes, la bibliothèque s'ouvre.</h2>
        <p className="pr-dark-body">L'audio recommandé s'affiche selon l'heure. Il ne reste qu'à écouter.</p>
        <div className="pr-phones">
          <div className="pr-phone"><img src={pwaRecommended} alt="Bibliothèque Spots Zen avec l'audio recommandé selon l'heure" loading="lazy" /></div>
          <div className="pr-phone"><img src={pwaPlayer} alt="Lecteur Spots Zen en cours de lecture" loading="lazy" /></div>
        </div>
        <button className="pr-link" onClick={() => scrollTo("devis")}>→ Demander un devis</button>
      </div>
    </section>

    <section className="pr-section" id="offre">
      <div className="pr-inner">
        <Heading eyebrow="CHAQUE ESPACE A SES BESOINS">Voici comment Spots Zen s'y adapte.</Heading>
        <div className="pr-tabs" role="tablist">{sectors.map(x => <button key={x.id} role="tab" aria-selected={x.id === active} className={x.id === active ? "is-active" : ""} onClick={() => setActive(x.id)}>{x.tab}</button>)}</div>
        <div className="pr-panel" role="tabpanel">
          <div className="pr-panel-text">
            <img className="pr-panel-img" src={s.image} alt="" loading="lazy" width={1024} height={768} />
            <span className="pr-chip">{s.chip}</span>
            <p className="pr-subchip">{s.sub}</p>
            <h3 className="pr-h3">{s.title}</h3>
            <p className="pr-body-left">{s.body}</p>
            {s.legal && <div className="pr-legal"><AlertCircle aria-hidden /><p>Spots Zen est un outil de bien-être complémentaire. Il ne constitue pas un dispositif médical et ne se substitue à aucun protocole de soin.</p></div>}
            <ul className="pr-checks">{s.list.map(l => <li key={l}><Check aria-hidden />{l}</li>)}</ul>
            <a className="pr-inline-link" href={`#form-${s.id}`}>→ Parlons de votre projet…</a>
          </div>
          <div id={`form-${s.id}`}><ContactForm key={s.id} secteur={s.id} title={s.formTitle} fields={s.fields} cta="Commencer maintenant →" /></div>
        </div>
      </div>
    </section>

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow="ILS ONT CHOISI SPOTS ZEN">Ce qu'ils en disent</Heading>
        <div className="pr-grid2">{["Directeur · Établissement partenaire", "Responsable bien-être · Structure partenaire"].map(r => <figure className="pr-card" key={r}><blockquote className="pr-testi">“[Témoignage à venir]”</blockquote><span className="pr-sep" /><figcaption><strong>À venir</strong><span>{r}</span></figcaption></figure>)}</div>
      </div>
    </section>

    {/* <SectionCarteSpots /> */}
    {/* À réactiver au lancement — ne pas intégrer maintenant */}

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow="POURQUOI SPOTS ZEN ?">Un investissement simple. Un impact durable.</Heading>
        <div className="pr-grid2">
          {([[Zap, "Accès immédiat", "Vos utilisateurs accèdent directement depuis leur navigateur. Une adoption immédiate, sans téléchargement."], [Mic, "Des audios de haute qualité", "Chaque scénario s’appuie sur des techniques reconnues — hypnose éricksonienne, yoga nidra, cohérence cardiaque. Enregistrés en studio. Musique composée sur mesure par Benoît Courti avec des fréquences binaurales."], [RefreshCw, "Un contenu pensé pour vos contextes", "Les audios sont conçus pour les moments clés — le réveil, la sieste, la nuit, le stress, la récupération."], [TrendingUp, "Une plateforme qui grandit avec vous", "La bibliothèque s’enrichit régulièrement. Vos utilisateurs bénéficient de chaque nouveau contenu automatiquement, sans frais supplémentaires."]] as const).map(([I, t, d]) => <div className="pr-card" key={t}><I aria-hidden className="pr-icon" /><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div>
    </section>

    <section className="pr-section pr-dark" id="devis">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">DÉMARRONS ENSEMBLE</p>
        <h2>Votre établissement mérite mieux qu'une brochure bien-être.</h2>
        <p className="pr-dark-body">Un investissement adapté à votre taille. Nos offres s'adaptent à tous les profils — du gîte familial au grand groupe hôtelier. Parlez-nous de votre projet. Nous concevons une offre sur-mesure pour votre structure.</p>
        <ContactForm secteur="general" title="Demander un devis" fields={generalFields} cta="Demander un devis →" large />
        <p className="pr-alt-contact">Ou écrivez-nous directement : bonjour@spotszen.fr</p>
      </div>
    </section>
  </main><HomeFooter /></div>;
}

