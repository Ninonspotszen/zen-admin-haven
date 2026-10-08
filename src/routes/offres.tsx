import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Leaf, Flower2, Headphones, PersonStanding, Users, Languages, Smartphone, CircleCheck, Lock, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/offres")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Offres & tarifs — Spots Zen" },
      { name: "description", content: "Abonnez-vous à Spots Zen : premier mois offert, sans engagement. 5 €/mois ou 49 €/an." },
      { property: "og:title", content: "Offres & tarifs — Spots Zen" },
      { property: "og:description", content: "Retrouvez votre pause bien-être, où que vous soyez. Premier mois offert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" },
    ],
  }),
  component: OffresPage,
});

const LOGO_FOR_LIGHT = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-fonce.png";
const LOGO_FOR_DARK = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-clair.png";
const LANGS = ["fr", "en", "de", "nl", "es"] as const;
const SLUGS = ["reveil-du-corps-f", "sieste-reparatrice-f", "glisser-vers-le-sommeil-f", "respiration-niveau-1-f"];

/* Palette scoped to this page, light + dark via .dark on <html>. */
const CSS = `
html:has(.sz),.sz{--o-bg:#F8F6F2;--o-fg:#1C2E1E;--o-eyebrow:#655e46;--o-sub:#556052;--o-brand:#2D5A27;--o-promo:#2D5A27;--o-card:#FFFFFF;--o-border:#E5E1D8;--o-thumb:#EAE6DE;--o-bar:rgba(248,246,242,0.85);
--background:var(--o-bg);--muted:var(--o-bg);--secondary:var(--o-bg);--accent:var(--o-bg);--card:var(--o-bg);--popover:var(--o-bg);
font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;background:var(--o-bg);color:var(--o-fg)}
html.dark:has(.sz),html.dark .sz{--o-bg:#0F1410;--o-fg:#F0EDE8;--o-eyebrow:#8A9E88;--o-sub:#8A9E88;--o-promo:#A1D494;--o-card:#1A2B1A;--o-border:rgba(45,90,39,0.25);--o-thumb:#1A2B1A;--o-bar:rgba(15,20,16,0.85)}
body:has(.sz){background:var(--o-bg)}
.sz .serif{font-family:"Playfair Display",Georgia,serif}
.sz .ocard{background:var(--o-card);border:1px solid var(--o-border)}
.sz .logo-dark{display:none}html.dark .sz .logo-light{display:none}html.dark .sz .logo-dark{display:block}
.sz .noscroll{scrollbar-width:none}.sz .noscroll::-webkit-scrollbar{display:none}
`;

type Preview = { id: string; slug: string | null; image_url: string | null; moment: string | null; type: string | null; duree_secondes: number | null; titre_fr: string | null; titre: string | null };

function OffresPage() {
  const [lang, setLang] = useState("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [items, setItems] = useState<Preview[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sz_lang");
    if (saved && (LANGS as readonly string[]).includes(saved)) setLang(saved);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: audios } = await supabase.from("audios").select("id, slug, image_url, moment, type, duree_secondes, titre_fr").in("slug", SLUGS);
      const list = (audios ?? []) as Omit<Preview, "titre">[];
      const ids = list.map((a) => a.id);
      const { data: trads } = ids.length
        ? await supabase.from("audios_traductions").select("audio_id, langue, titre").in("audio_id", ids)
        : { data: [] };
      const titleFor = (id: string) => {
        const rows = (trads ?? []).filter((t) => t.audio_id === id && t.titre);
        return rows.find((t) => t.langue === lang)?.titre ?? rows.find((t) => t.langue === "fr")?.titre ?? null;
      };
      setItems(SLUGS.map((s) => list.find((a) => a.slug === s)).filter(Boolean).map((a) => ({ ...a!, titre: titleFor(a!.id) })));
    })();
  }, [lang]);

  const chooseLang = (l: string) => { setLang(l); localStorage.setItem("sz_lang", l); setLangOpen(false); };

  const benefits = [
    { Icon: Headphones, text: "16 audios d'immersion bien-être", strong: true },
    { Icon: PersonStanding, text: "Méditation · Respiration · Visualisation · Immersion sonore" },
    { Icon: Users, text: "Des parcours adaptés pour adultes et pour enfants" },
    { Icon: Languages, text: "Disponible en 5 langues : FR · EN · DE · NL · ES" },
    { Icon: Smartphone, text: "Sans application à télécharger, écoute instantanée" },
    { Icon: CircleCheck, text: "Résiliation en un clic · Sans aucun engagement" },
  ];

  return (
    <div className="sz min-h-screen pb-[env(safe-area-inset-bottom)]">
      <style>{CSS}</style>

      <header className="sticky top-0 z-30 border-b border-[var(--o-border)] bg-[var(--o-bar)] pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="relative mx-auto flex h-14 max-w-md items-center justify-center px-5">
          <img src={LOGO_FOR_LIGHT} alt="Spots Zen" className="logo-light h-8 w-auto object-contain" />
          <img src={LOGO_FOR_DARK} alt="Spots Zen" className="logo-dark h-8 w-auto object-contain" />
          <div className="absolute right-5">
            <button onClick={() => setLangOpen((o) => !o)} className="flex h-9 items-center gap-1 rounded-full border border-[var(--o-border)] px-4 text-sm font-semibold" aria-haspopup="listbox" aria-expanded={langOpen}>
              {lang.toUpperCase()} <span aria-hidden>▾</span>
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute right-0 mt-2 w-24 overflow-hidden rounded-xl border border-[var(--o-border)] bg-[var(--o-bg)] py-1">
                {LANGS.map((l) => (
                  <li key={l}><button onClick={() => chooseLang(l)} className={`block h-10 w-full px-4 text-left text-sm font-semibold ${l === lang ? "text-[var(--o-brand)]" : ""}`}>{l.toUpperCase()}</button></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md pb-12">
        {/* HERO */}
        <section className="px-6 pb-12 pt-6 text-center">
          <p className="flex items-center justify-center gap-3 text-[12px] uppercase tracking-[0.25em] text-[var(--o-eyebrow)]">
            <span aria-hidden>—</span>Immersions bien-être<span aria-hidden>—</span>
          </p>
          <h1 className="serif mt-4 text-[30px] font-normal leading-tight">Retrouvez votre pause bien-être, où que vous soyez</h1>
          <p className="mt-3 text-[14px] text-[var(--o-sub)]">La bibliothèque audio qui vous accompagne au quotidien</p>
        </section>

        {/* PROMO */}
        <p className="flex items-center justify-center gap-2 px-6 text-center text-sm font-semibold text-[var(--o-promo)]">
          <Leaf className="h-4 w-4 shrink-0" aria-hidden />Premier mois offert — sans engagement
        </p>

        {/* PRICING */}
        <section className="mt-5 grid grid-cols-2 gap-3.5 px-6">
          <div className="ocard flex flex-col rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--o-eyebrow)]">Mensuel</p>
            <p className="serif mt-2 text-[24px]">5 €<span className="ml-1 font-sans text-[12px] text-[var(--o-sub)]">/mois</span></p>
            <span className="mt-2 self-start rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[11px] text-[var(--o-promo)]">1er mois offert</span>
            <p className="mt-3 flex-1 text-[12px] text-[var(--o-sub)]">Accès illimité sans engagement</p>
            <a href="/checkout?plan=mensuel" className="mt-4 flex min-h-[44px] items-center justify-center rounded-full border border-[var(--o-promo)] text-sm font-semibold text-[var(--o-promo)]">Commencer</a>
          </div>
          <div className="ocard relative flex flex-col rounded-2xl p-5">
            <span className="absolute -top-2.5 right-3 rounded-full bg-[#2D5A27] px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#F8F6F2]">Meilleure offre</span>
            <p className="text-[11px] uppercase tracking-wider text-[var(--o-promo)]">Annuel</p>
            <p className="serif mt-2 text-[24px]">49 €<span className="ml-1 font-sans text-[12px] text-[var(--o-sub)]">/an</span></p>
            <span className="mt-2 self-start rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[11px] text-[var(--o-promo)]">2 mois offerts</span>
            <p className="mt-3 flex-1 text-[12px] text-[var(--o-sub)]">Soit 4 €/mois · Sérénité à l'année</p>
            <a href="/checkout?plan=annuel" className="mt-4 flex min-h-[44px] items-center justify-center rounded-full bg-[#2D5A27] text-sm font-semibold text-[#F8F6F2]">Commencer</a>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="mt-12 px-6">
          <div className="ocard rounded-2xl p-6">
            <h2 className="serif flex items-center gap-3 text-[18px]"><Flower2 className="h-5 w-5 text-[var(--o-promo)]" aria-hidden />Ce que vous obtenez</h2>
            <ul className="mt-5 space-y-4">
              {benefits.map(({ Icon, text, strong }) => (
                <li key={text} className={`flex gap-3 text-[13px] ${strong ? "font-medium text-[var(--o-promo)]" : "text-[var(--o-sub)]"}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--o-promo)]" aria-hidden />{text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CATALOG PREVIEW */}
        <section className="mt-12">
          <div className="flex items-start justify-between px-6">
            <div>
              <h2 className="serif text-[18px]">Aperçu du catalogue</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--o-eyebrow)]"><Lock className="h-[13px] w-[13px]" aria-hidden />Réservé aux abonnés</p>
            </div>
            <span className="rounded-full border border-[var(--o-border)] px-3 py-1 text-xs">16 audios</span>
          </div>
          <div className="noscroll mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
            {items.map((a) => {
              const min = a.duree_secondes ? `${Math.round(a.duree_secondes / 60)} min` : "";
              const badge = [a.moment && a.moment.toLowerCase() !== "tous" ? a.moment : null, min].filter(Boolean).join(" · ");
              return (
                <article key={a.id} className="ocard w-60 flex-shrink-0 snap-start overflow-hidden rounded-2xl">
                  <div className="relative aspect-[4/3] bg-[var(--o-thumb)]">
                    {a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#F8F6F2]"><Lock className="h-4 w-4" aria-hidden /></span>
                    {badge && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#1C2E1E]">{badge}</span>}
                  </div>
                  <div className="p-4">
                    <p className="text-[15px] font-medium leading-snug">{a.titre ?? a.titre_fr}</p>
                    {a.type && <p className="mt-1 text-[12px] text-[var(--o-sub)]">{a.type}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-12 px-6">
          <div className="ocard rounded-2xl p-6 text-center">
            <a href="/checkout?plan=mensuel" className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#2D5A27] px-5 text-[15px] font-semibold text-[#F8F6F2]">
              Commencer mon premier mois gratuit <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <p className="mt-3 text-[12px] text-[var(--o-sub)]">Puis 5 €/mois · Sans engagement · Résiliation en 1 clic</p>
            <div className="mt-5 flex items-center justify-center gap-1.5 whitespace-nowrap border-t border-[var(--o-border)] pt-4 text-[11px] text-[var(--o-sub)]">
              <span className="flex items-center gap-1"><Headphones className="h-3.5 w-3.5" aria-hidden />16 audios</span>
              <span className="text-[#E5E1D8]">·</span>
              <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" aria-hidden />5 langues</span>
              <span className="text-[#E5E1D8]">·</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" aria-hidden />Sans application</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
