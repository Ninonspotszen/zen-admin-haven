import i18n from "@/i18n/index";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";
import {
  Leaf, Flower2, Headphones, PersonStanding, Users, Languages, Smartphone, CircleCheck, Lock, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/checkout.functions";

export const Route = createFileRoute("/offres")({
  ssr: false,
  head: () => ({
    meta: [
      { title: i18n.t("offers.meta.title") },
      { name: "description", content: i18n.t("offers.meta.description") },
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
.sz .otag{background:rgba(15,20,16,0.65);color:#F0EDE8}
.sz .olock{display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border:1px solid var(--o-fg);border-radius:50%;color:var(--o-fg)}
.sz .olock.on-photo{border-color:#FFFFFF;color:#FFFFFF}
`;

const MOMENT_KEY: Record<string, string> = {
  "Matin": "common.moment.morning",
  "Journée": "common.moment.day",
  "Soir": "common.moment.evening",
  "Nuit": "common.moment.night",
  "Tous moments": "common.moment.anytime",
};

type Preview = { id: string; slug: string | null; image_url: string | null; moment: string | null; type: string | null; duree_secondes: number | null; titre_fr: string | null; titre: string | null };

function OffresPage() {
  const { t } = useTranslation();
  const [lang, setLang] = useState("fr");
  const [items, setItems] = useState<Preview[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const startCheckout = async (plan: "mensuel" | "annuel") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/connexion"; return; }
    setBusy(plan);
    try {
      const { url } = await createCheckoutSession({ data: { plan, origin: window.location.origin } });
      window.location.href = url;
    } catch {
      setBusy(null);
      alert(t("offers.error.payment"));
    }
  };

  useEffect(() => {
    const apply = (l: string) => { if ((LANGS as readonly string[]).includes(l)) setLang(l); };
    apply(localStorage.getItem("sz-lang") ?? i18n.language);
    i18n.on("languageChanged", apply);
    return () => { i18n.off("languageChanged", apply); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: audios } = await supabase.from("audios").select("id, slug, image_url, moment, type, duree_secondes, titre_fr").in("slug", SLUGS);
      const list = (audios ?? []) as Omit<Preview, "titre">[];
      const ids = list.map((a) => a.id);
      const { data: trads } = ids.length
        ? await supabase.rpc("get_public_titles", { p_audio_ids: ids })
        : { data: [] };
      const titleFor = (id: string) => {
        const rows = (trads ?? []).filter((t) => t.audio_id === id && t.titre);
        return rows.find((t) => t.langue === lang)?.titre ?? rows.find((t) => t.langue === "fr")?.titre ?? null;
      };
      setItems(SLUGS.map((s) => list.find((a) => a.slug === s)).filter(Boolean).map((a) => ({ ...a!, titre: titleFor(a!.id) })));
    })();
  }, [lang]);


  const benefits = [
    { Icon: Headphones, text: t("offers.benefit.audios"), strong: true },
    { Icon: PersonStanding, text: t("offers.benefit.types") },
    { Icon: Users, text: t("offers.benefit.parcours") },
    { Icon: Languages, text: t("offers.benefit.langs") },
    { Icon: Smartphone, text: t("offers.benefit.noApp") },
    { Icon: CircleCheck, text: t("offers.benefit.cancel") },
  ];

  return (
    <div className="sz min-h-screen pb-[env(safe-area-inset-bottom)]">
      <style>{CSS}</style>

      <header className="sticky top-0 z-30 border-b border-[var(--o-border)] bg-[var(--o-bar)] pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="relative mx-auto flex h-14 max-w-md items-center justify-center px-5">
          <img src={LOGO_FOR_LIGHT} alt="Spots Zen" className="logo-light h-8 w-auto object-contain" />
          <img src={LOGO_FOR_DARK} alt="Spots Zen" className="logo-dark h-8 w-auto object-contain" />
        </div>
      </header>

      <main className="mx-auto max-w-md pb-12">
        {/* HERO */}
        <section className="px-6 pb-12 pt-6 text-center">
          <p className="flex items-center justify-center gap-3 text-[12px] uppercase tracking-[0.25em] text-[var(--o-eyebrow)]">
            <span aria-hidden>—</span>{t("offers.hero.eyebrow")}<span aria-hidden>—</span>
          </p>
          <h1 className="serif mt-4 text-[30px] font-normal leading-tight">{t("offers.hero.h1")}</h1>
          <p className="mt-3 text-[14px] text-[var(--o-sub)]">{t("offers.hero.subtitle")}</p>
        </section>

        {/* PROMO */}
        <p className="flex items-center justify-center gap-2 px-6 text-center text-sm font-semibold text-[var(--o-promo)]">
          <Leaf className="h-4 w-4 shrink-0" aria-hidden />{t("offers.promo.badge")}
        </p>

        {/* PRICING */}
        <section className="mt-5 grid grid-cols-2 gap-3.5 px-6">
          <div className="ocard flex flex-col rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--o-eyebrow)]">{t("offers.plan.monthly.label")}</p>
            <p className="serif mt-2 text-[24px]">5 €<span className="ml-1 font-sans text-[12px] text-[var(--o-sub)]">/mois</span></p>
            <span className="mt-2 self-start rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[11px] text-[var(--o-promo)]">{t("offers.plan.monthly.promo")}</span>
            <p className="mt-3 flex-1 text-[12px] text-[var(--o-sub)]">{t("offers.plan.monthly.desc")}</p>
            <button type="button" disabled={busy !== null} onClick={() => startCheckout("mensuel")} className="w-full disabled:opacity-60 mt-4 flex min-h-[44px] items-center justify-center rounded-full border border-[var(--o-promo)] text-sm font-semibold text-[var(--o-promo)]">{t("offers.plan.monthly.cta")}</button>
          </div>
          <div className="ocard relative flex flex-col rounded-2xl p-5">
            <span className="absolute -top-2.5 right-3 rounded-full bg-[#2D5A27] px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#F8F6F2]">{t("offers.plan.annual.badge")}</span>
            <p className="text-[11px] uppercase tracking-wider text-[var(--o-promo)]">{t("offers.plan.annual.label")}</p>
            <p className="serif mt-2 text-[24px]">49 €<span className="ml-1 font-sans text-[12px] text-[var(--o-sub)]">/an</span></p>
            <span className="mt-2 self-start rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[11px] text-[var(--o-promo)]">{t("offers.plan.annual.promo")}</span>
            <p className="mt-3 flex-1 text-[12px] text-[var(--o-sub)]">{t("offers.plan.annual.desc")}</p>
            <button type="button" disabled={busy !== null} onClick={() => startCheckout("annuel")} className="w-full disabled:opacity-60 mt-4 flex min-h-[44px] items-center justify-center rounded-full bg-[#2D5A27] text-sm font-semibold text-[#F8F6F2]">{t("offers.plan.annual.cta")}</button>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="mt-12 px-6">
          <div className="ocard rounded-2xl p-6">
            <h2 className="serif flex items-center gap-3 text-[18px]"><Flower2 className="h-5 w-5 text-[var(--o-promo)]" aria-hidden />{t("offers.benefits.h2")}</h2>
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
          <div className="px-6">
            <h2 className="serif text-[18px]">{t("offers.catalog.h2")}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--o-eyebrow)]"><Lock className="h-[13px] w-[13px]" aria-hidden />{t("offers.catalog.locked")}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 px-6">
            {items.map((a) => {
              const min = a.duree_secondes ? `${Math.round(a.duree_secondes / 60)} min` : "";
              const moment = a.moment && MOMENT_KEY[a.moment] ? t(MOMENT_KEY[a.moment]) : null;
              return (
                <article key={a.id} className="rounded-2xl text-left">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--o-thumb)]">
                    {a.image_url && <img src={a.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                    {moment && <span className="otag absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold">{moment}</span>}
                    <span className={`olock absolute bottom-3 right-3 ${a.image_url ? "on-photo" : ""}`}><Lock className="h-5 w-5" aria-hidden /></span>
                  </div>
                  <p className="serif mt-2 line-clamp-2 px-1 text-sm font-medium leading-tight">{a.titre ?? a.titre_fr}</p>
                  <p className="mt-0.5 px-1 pb-1 text-xs text-[var(--o-sub)]">{[min, a.type].filter(Boolean).join(" · ")}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-12 px-6">
          <div className="ocard rounded-2xl p-6 text-center">
            <button type="button" disabled={busy !== null} onClick={() => startCheckout("mensuel")} className="w-full disabled:opacity-60 flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#2D5A27] px-5 text-[15px] font-semibold text-[#F8F6F2]">
              {t("offers.cta.final")} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <p className="mt-3 text-[12px] text-[var(--o-sub)]">{t("offers.cta.legal")}</p>
          </div>
        </section>
      </main>
      <div className="flex justify-center pb-10"><LanguageSwitcher /></div>
    </div>
  );
}
