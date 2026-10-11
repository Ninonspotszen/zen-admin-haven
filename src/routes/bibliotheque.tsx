import i18n from "@/i18n/index";
import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bibliotheque")({
  ssr: false,
  head: () => ({
    meta: [
      { title: i18n.t("lib.meta.title") },
      { name: "description", content: i18n.t("lib.meta.description") },
      { property: "og:title", content: i18n.t("lib.meta.title") },
      { property: "og:description", content: i18n.t("lib.meta.og.description") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Plus+Jakarta+Sans:wght@400;600&display=swap",
      },
    ],
  }),
  component: BibliothequePage,
});

type Spot = { id: string; nom: string | null; description: string | null; photo_url: string | null; adresse: string | null; client_nom: string | null };
type Trad = { langue: string; voix: string | null; titre: string; description: string | null; cloudinary_url: string | null };
type Audio = { id: string; slug: string | null; ordre: number | null; type: string | null; moment: string | null; image_url: string | null; duree_secondes: number | null; titre_fr: string | null; mis_en_avant: boolean | null; mis_en_avant_moment: string | null; traductions: Trad[] | null };

const LOGO_LIGHT = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-clair.png";
const LOGO_DARK = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-fonce.png";
const LANGS = ["fr", "en", "de", "nl", "es"] as const;

/* Palette scoped to this page (Spots Zen B2C brand), light + dark via .dark on <html>. */
const PAGE_CSS = `
html:has(.sz),.sz{--sz-bg:#F8F6F2;--sz-fg:#1C2E1E;--sz-muted:#5A6B5C;--sz-brand:#2D5A27;--sz-on-brand:#F8F6F2;--sz-chip:transparent;--sz-chip-fg:#1C2E1E;--sz-chip-border:#D8D2C5;--sz-hair:#D8D2C5;--sz-card:#F8F6F2;--sz-card-border:rgba(195,185,156,0.35);--sz-menu:#F8F6F2;--sz-menu-hover:#E8E4DC;--sz-bar:rgba(248,246,242,0.85);--sz-player:#F8F6F2;--sz-thumb:#EAF3E6;
font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;background:var(--sz-bg);color:var(--sz-fg)}
html.dark:has(.sz),html.dark .sz{--sz-bg:#0F1410;--sz-fg:#F0EDE8;--sz-muted:#8B9B8B;--sz-chip:transparent;--sz-chip-fg:#F8F6F2;--sz-chip-border:rgba(45,90,39,0.35);--sz-menu:#0F1410;--sz-menu-hover:#0F1410;--sz-hair:rgba(45,90,39,0.25);--sz-card:#0F1410;--sz-card-border:rgba(45,90,39,0.20);--sz-bar:rgba(15,20,16,0.85);--sz-player:#0F1410;--sz-thumb:rgba(45,90,39,0.25)}
.sz .serif{font-family:"Playfair Display",Georgia,serif}
.sz .noscroll{scrollbar-width:none}.sz .noscroll::-webkit-scrollbar{display:none}
html:has(.sz),.sz{--background:var(--sz-bg);--muted:var(--sz-bg);--secondary:var(--sz-bg);--accent:var(--sz-bg);--card:var(--sz-bg);--popover:var(--sz-bg);--foreground:var(--sz-fg);--card-foreground:var(--sz-fg);--popover-foreground:var(--sz-fg);--muted-foreground:var(--sz-muted);--secondary-foreground:var(--sz-fg);--accent-foreground:var(--sz-fg);--sz-play:#1C2E1E;--sz-photo-play:#FFFFFF;--sz-placeholder:#C8C4BC}
html.dark:has(.sz),html.dark .sz{--sz-play:#FFFFFF}
body:has(.sz),.sz main,.sz section,.sz ul,.sz li,.sz header,.sz main > div,.sz section > div{background:var(--sz-bg)}
.sz .audio-card,.sz .audio-copy{background:transparent}
.sz .audio-title{color:var(--sz-fg)}
.sz .audio-duration{color:var(--sz-muted)}
.sz .play-control{display:inline-flex;width:44px;height:44px;min-width:44px;flex-shrink:0;align-items:center;justify-content:center;border:1px solid var(--sz-play);border-radius:50%;background:transparent!important;color:var(--sz-play);padding:0;box-shadow:none}
.sz .play-control.play-on-photo{border-color:var(--sz-photo-play);color:var(--sz-photo-play)}
.sz .logo-for-dark{display:none}
html.dark .sz .logo-for-light{display:none}
html.dark .sz .logo-for-dark{display:block}
.sz .play-control svg{width:20px;height:20px}
.sz .missing-image{display:flex;width:64px;height:64px;flex-shrink:0;align-items:center;justify-content:center;border-radius:50%;background:var(--sz-placeholder);color:var(--sz-fg);font-size:24px}
.sz .missing-thumb{width:48px;height:48px;font-size:20px}
.sz .tag{background:rgba(15,20,16,0.65);color:#F0EDE8}
.sz input[type=range]{accent-color:var(--sz-brand)}
`;

function currentMoment() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Matin";
  if (h >= 12 && h < 17) return "Journée";
  if (h >= 17 && h < 22) return "Soir";
  return "Nuit";
}
const fmt = (s: number | null) => (s ? `${Math.round(s / 60)} min` : "");
const isMusic = (a: Audio) => a.type === "Musique";
const voiceLabel = (v: string | null) => (v === "feminine" || v === "F" ? "Voix féminine" : v === "masculine" || v === "M" ? "Voix masculine" : "Sans voix");

/* Filter chips keep their technical value (matched against audios.type / moment); only the label is translated. */
const CATEGORY_KEY: Record<string, string> = {
  "Tous": "common.filter.all",
  "Méditation": "common.filter.meditation",
  "Respiration": "common.filter.respiration",
  "Musique": "common.filter.music",
  "Visualisation": "common.filter.visualisation",
  "Enfant": "common.filter.enfant",
};
const MOMENT_KEY: Record<string, string> = {
  "Matin": "common.moment.morning",
  "Journée": "common.moment.day",
  "Soir": "common.moment.evening",
  "Nuit": "common.moment.night",
};

/* Rows that carry a playable file, in the selected language (FR fallback). */
function tradsFor(a: Audio, lang: string) {
  const all = (a.traductions ?? []).filter((t) => t.cloudinary_url);
  const inLang = all.filter((t) => t.langue === lang);
  return inLang.length ? inLang : all.filter((t) => t.langue === "fr");
}
/* Title/description come from audios_traductions for the selected language (FR fallback). */
function rowsInLang(a: Audio, lang: string) {
  const all = a.traductions ?? [];
  const inLang = all.filter((t) => t.langue === lang);
  return inLang.length ? inLang : all.filter((t) => t.langue === "fr");
}
const firstText = (...vals: (string | null | undefined)[]) => vals.find((v) => v && v.trim()) ?? null;
function textOf(a: Audio, lang: string, field: "titre" | "description") {
  const rows = rowsInLang(a, lang);
  return firstText(...rows.map((t) => t[field]), ...rows.map((t) => (t[field] ?? "").trim() || null));
}
function titleOf(a: Audio, lang: string) {
  return textOf(a, lang, "titre") ?? a.titre_fr ?? "";
}

function PlayIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
}

function BibliothequePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "catalog">("loading");
  const [prenom, setPrenom] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [aboOpen, setAboOpen] = useState(false);
  const [abo, setAbo] = useState<{ formule: string | null; date_renouvellement: string | null } | null>(null);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [lang, setLang] = useState(() => ((LANGS as readonly string[]).includes(i18n.language) ? i18n.language : "fr"));
  const [langOpen, setLangOpen] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [selected, setSelected] = useState<Audio | null>(null);
  /* Audio language follows the active i18n language (FR fallback) and reloads on change. */
  useEffect(() => {
    setLang((LANGS as readonly string[]).includes(i18n.language) ? i18n.language : "fr");
  }, [i18n.language]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/connexion", replace: true }); return; }
      setUserId(user.id);
      const full = (user.user_metadata?.["full_name"] as string | undefined)?.trim();
      setPrenom(full ? full.split(/\s+/)[0] ?? "" : user.email ?? "");
      /* abonnes_b2c.id is the account id; renewal date lives in date_fin_acces. */
      const { data: aboData } = await supabase
        .from("abonnes_b2c")
        .select("formule, date_fin_acces")
        .eq("id", user.id)
        .maybeSingle();
      setAbo(aboData ? { formule: aboData.formule, date_renouvellement: aboData.date_fin_acces } : null);
      const { data } = await supabase
        .from("audios")
        .select("*, traductions:audios_traductions(*)")
        .limit(200)
        .order("ordre", { ascending: true, nullsFirst: false });
      setAudios((data as unknown as Audio[] | null) ?? []);
      setState("catalog");
    })();
  }, [navigate]);

  const moment = currentMoment();
  const playable = audios.filter((a) => tradsFor(a, lang).length > 0);
  const hero = playable.find((a) => a.mis_en_avant && a.mis_en_avant_moment === moment) ?? playable[0];
  const categories = ["Tous", "Méditation", "Respiration", "Musique", "Visualisation", "Enfant"];
  const match = (a: Audio) =>
    filter === "Tous" ? true : filter === "Enfant" ? a.moment === "enfant" : a.type === filter;
  const guided = audios.filter((a) => !isMusic(a) && match(a));
  const music = audios.filter((a) => isMusic(a) && match(a));

  return (
    <div className="sz min-h-screen pb-[env(safe-area-inset-bottom)]">
      <style>{PAGE_CSS}</style>

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-[rgba(195,185,156,0.25)] bg-[var(--sz-bar)] pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <img src={LOGO_DARK} alt="Spots Zen" className="logo-for-light h-8 w-auto object-contain" />
          <img src={LOGO_LIGHT} alt="Spots Zen" className="logo-for-dark h-8 w-auto object-contain" />
          <div className="relative">
            <button onClick={() => setLangOpen((o) => !o)} className="flex h-9 items-center gap-1 rounded-full border border-[var(--sz-chip-border)] bg-transparent px-4 text-sm font-semibold text-[var(--sz-chip-fg)]" aria-haspopup="listbox" aria-expanded={langOpen}>
              {lang.toUpperCase()} <span aria-hidden>▾</span>
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute right-0 mt-2 w-24 overflow-hidden rounded-xl border border-[var(--sz-hair)] bg-[var(--sz-menu)] py-1 shadow-[0_4px_16px_rgba(28,46,30,0.08)]">
                {LANGS.map((l) => (
                  <li key={l}>
                    <button onClick={() => { setLang(l); localStorage.setItem("sz-lang", l); i18n.changeLanguage(l); setLangOpen(false); }} className={`block h-10 w-full px-4 text-left text-sm font-semibold hover:bg-[var(--sz-menu-hover)] ${l === lang ? "text-[var(--sz-brand)]" : "text-[var(--sz-fg)]"}`}>
                      {l.toUpperCase()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-10">
        {state === "loading" && (
          <div className="mt-6 space-y-4">
            <div className="aspect-video animate-pulse rounded-2xl bg-[var(--sz-hair)]" />
            <div className="grid grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-[var(--sz-hair)]" />)}</div>
          </div>
        )}

        {state === "catalog" && (
          <p className="mt-4 text-xs text-[var(--sz-muted)]">
            {t("lib.greeting", { prenom })}
          </p>
        )}

        {state === "catalog" && (
          <>
            {/* HERO */}
            {hero && (
              <button onClick={() => setSelected(hero)} className="relative mt-5 block aspect-video w-full overflow-hidden rounded-2xl text-left" aria-label={`${t("spot.audio.listen")} ${titleOf(hero, lang)}`}>
                {hero.image_url ? <img src={hero.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><span className="missing-image" aria-hidden>♪</span></div>}
                {hero.image_url && <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(15,20,16,0.85)_100%)]" />}
                {hero.mis_en_avant_moment && <span className="tag absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold">⏱ {t(MOMENT_KEY[hero.mis_en_avant_moment] ?? "common.moment.day")}</span>}
                <span className={`play-control absolute right-3 top-3 ${hero.image_url ? "play-on-photo" : ""}`}><PlayIcon /></span>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className={`serif text-[22px] font-medium leading-tight ${hero.image_url ? "text-[var(--sz-on-brand)]" : "audio-title"}`}>{titleOf(hero, lang)}</p>
                  <p className={`text-xs ${hero.image_url ? "text-[var(--sz-on-brand)]" : "audio-duration"}`}>{[fmt(hero.duree_secondes), hero.type].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            )}

            {/* FILTRES */}
            <div className="noscroll -mx-5 mt-10 flex gap-2 overflow-x-auto px-5">
              {categories.map((c) => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`shrink-0 rounded-full border px-5 py-2 text-xs font-semibold ${c === filter ? "border-[var(--sz-brand)] bg-[var(--sz-brand)] text-[var(--sz-on-brand)]" : "border-[var(--sz-chip-border)] bg-transparent text-[var(--sz-chip-fg)]"}`}>
                  {t(CATEGORY_KEY[c] ?? "common.filter.all")}
                </button>
              ))}
            </div>

            {/* IMMERSIONS */}
            {guided.length > 0 && (
              <section className="mt-10">
                <Eyebrow>{t("common.section.guided")}</Eyebrow>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {guided.map((a) => (
                    <button key={a.id} onClick={() => setSelected(a)} className="audio-card rounded-2xl text-left">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                        {a.image_url ? <img src={a.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><span className="missing-image" aria-hidden>♪</span></div>}
                        
                        {a.mis_en_avant_moment && <span className="tag absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold">{t(MOMENT_KEY[a.mis_en_avant_moment] ?? "common.moment.day")}</span>}
                        <span className={`play-control absolute bottom-3 right-3 ${a.image_url ? "play-on-photo" : ""}`}><PlayIcon /></span>
                      </div>
                      <p className="audio-copy audio-title serif mt-2 line-clamp-2 px-1 text-sm font-medium leading-tight">{titleOf(a, lang)}</p>
                      <p className="audio-copy audio-duration mt-0.5 px-1 pb-1 text-xs">{[fmt(a.duree_secondes), a.type].filter(Boolean).join(" · ")}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* MUSIQUES */}
            {music.length > 0 && (
              <section className="mt-10">
<Eyebrow>{t("common.section.music")}</Eyebrow>
                <p className="mt-1 text-xs text-[var(--sz-muted)]">{t("common.section.musicSubtitle")}</p>
                <ul className="mt-3">
                  {music.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 border-b border-[var(--sz-hair)] py-3 last:border-b-0">
                      <Thumb audio={a} />
                      <div className="audio-copy min-w-0 flex-1">
                        <p className="audio-title truncate text-sm font-semibold">{titleOf(a, lang)}</p>
                        <p className="audio-duration text-xs">{fmt(a.duree_secondes)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelected(a)} aria-label={`${t("spot.audio.listen")} ${titleOf(a, lang)}`} className="play-control"><PlayIcon /></Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {guided.length === 0 && music.length === 0 && <p className="mt-10 text-center text-sm text-[var(--sz-muted)]">{t("lib.empty")}</p>}
          </>
        )}
      </main>

      {state === "catalog" && (
        <div className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <section className="audio-card rounded-2xl border border-[var(--sz-card-border)] px-5">
            <button onClick={() => setAboOpen((o) => !o)} aria-expanded={aboOpen}
              className="flex h-14 w-full items-center justify-between bg-transparent text-sm font-semibold text-[var(--sz-fg)]">
              <span className="serif text-base font-medium">{t("lib.abo.section")}</span>
              <span className="text-xs text-[var(--sz-muted)]" aria-hidden>{aboOpen ? "▴" : "▾"}</span>
            </button>
            {aboOpen && (
              <div className="space-y-3 border-t border-[var(--sz-hair)] py-4">
                <div className="flex justify-between gap-4 text-sm">
<span className="text-[var(--sz-muted)]">{t("lib.abo.plan")}</span>
                  <span className="text-right font-semibold text-[var(--sz-fg)]">{abo?.formule ?? t("lib.abo.planDefault")}</span>
                </div>
                <div className="flex justify-between gap-4 pb-2 text-sm">
                  <span className="text-[var(--sz-muted)]">{t("lib.abo.renewal")}</span>
                  <span className="text-right font-semibold text-[var(--sz-fg)]">
                    {abo?.date_renouvellement
                      ? new Date(abo.date_renouvellement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {selected && <Player key={selected.id} audio={selected} list={playable} sponsor="" lang={lang}
        onLang={(l) => { setLang(l); localStorage.setItem("sz-lang", l); i18n.changeLanguage(l); }} spotId={null} userId={userId} onClose={() => setSelected(null)} onSelect={setSelected} />}
    </div>
  );
}


function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--sz-muted)]">{children}</h2>;
}

function Thumb({ audio }: { audio: Audio }) {
  return audio.image_url
    ? <img src={audio.image_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
    : <span className="missing-image missing-thumb" aria-hidden>♪</span>;
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-20 text-center">
      <h1 className="serif text-2xl font-medium">{title}</h1>
      <p className="mt-2 text-sm text-[var(--sz-muted)]">{text}</p>
    </div>
  );
}

const PLAYER_CSS = `
.szp{--background:#1A1F1A;--card:#1A1F1A;--popover:#1A1F1A;--muted:#1A1F1A;--secondary:#1A1F1A;--accent:#1A1F1A;background:#1A1F1A;color:#F0EDE8;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}
.szp,.szp *{box-sizing:border-box}
.szp .serif{font-family:"Playfair Display",Georgia,serif}
.szp .seek{-webkit-appearance:none;appearance:none;width:100%;height:14px;background:transparent;cursor:pointer}
.szp .seek::-webkit-slider-runnable-track{height:3px;border-radius:3px;background:linear-gradient(90deg,#4A7A43 var(--p),rgba(255,255,255,0.20) var(--p))}
.szp .seek::-moz-range-track{height:3px;border-radius:3px;background:linear-gradient(90deg,#4A7A43 var(--p),rgba(255,255,255,0.20) var(--p))}
.szp .seek::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#F0EDE8;margin-top:-5.5px;border:0}
.szp .seek::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#F0EDE8;border:0}
`;

function SkipIcon({ forward }: { forward?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={forward ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
    </svg>
  );
}

function Player({ audio, list, sponsor, lang, onLang, spotId, userId, onClose, onSelect }: {
  audio: Audio; list: Audio[]; sponsor: string; lang: string; onLang: (l: string) => void; spotId: string | null; userId?: string | null; onClose: () => void; onSelect: (a: Audio) => void;
}) {
  const { t: tr } = useTranslation();
  const trads = tradsFor(audio, lang);
  const voiced = trads.filter((t) => t.voix && t.voix !== "aucune");
  const hasVoices = voiced.length > 0;
  const [voice, setVoice] = useState<string>(() => localStorage.getItem("sz_voice") || "feminine");
  const trad = hasVoices ? (voiced.find((t) => t.voix === voice) ?? voiced[0]) : trads[0] ?? null;
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(audio.duree_secondes ?? 0);
  const [langOpen, setLangOpen] = useState(false);
  const logged = useRef(false);
  const idx = list.findIndex((a) => a.id === audio.id);
  const next = list.length > 1 ? list[(idx + 1) % list.length] : null;

  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevBg = document.body.style.backgroundColor;
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#1A1F1A";
    return () => { document.body.style.overflow = prev; document.body.style.backgroundColor = prevBg; };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !trad) return;
    const log = () => {
      if (logged.current || el.currentTime < 5) return;
      logged.current = true;
      void supabase.from("ecoutes").insert({ audio_id: audio.id, spot_id: spotId, user_id: userId ?? null, langue: trad.langue, voix: trad.voix, duree_ecoute_sec: Math.round(el.currentTime) });
    };
    const onTime = () => { setTime(el.currentTime); log(); };
    const onEnd = () => { log(); if (next) onSelect(next); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    window.addEventListener("pagehide", log);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: trad.titre, artist: "Spots Zen", artwork: audio.image_url ? [{ src: audio.image_url }] : [] });
      navigator.mediaSession.setActionHandler("seekbackward", () => { el.currentTime = Math.max(0, el.currentTime - 15); });
      navigator.mediaSession.setActionHandler("seekforward", () => { el.currentTime = Math.min(el.duration || 0, el.currentTime + 15); });
    }
    return () => { el.removeEventListener("timeupdate", onTime); el.removeEventListener("ended", onEnd); window.removeEventListener("pagehide", log); };
  }, [audio.id, audio.image_url, spotId, userId, trad, next, onSelect]);

  const close = () => { ref.current?.pause(); onClose(); };
  const toggle = () => { const el = ref.current; if (!el) return; if (el.paused) void el.play(); else el.pause(); };
  const skip = (d: number) => { const el = ref.current; if (el) el.currentTime = Math.max(0, Math.min(el.duration || dur, el.currentTime + d)); };
  const pickVoice = (v: string) => {
    const t = ref.current?.currentTime ?? 0;
    localStorage.setItem("sz_voice", v); setVoice(v);
    requestAnimationFrame(() => { if (ref.current) ref.current.currentTime = t; });
  };
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const title = firstText(trad?.titre, textOf(audio, lang, "titre"), audio.titre_fr) ?? "";
  const desc = firstText(trad?.description, textOf(audio, lang, "description"));
  const meta = [audio.type, audio.moment ?? audio.mis_en_avant_moment, fmt(audio.duree_secondes)].filter(Boolean).join(" · ").toUpperCase();
  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;

  return (
    <div className="szp fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title || "Lecteur audio"}>
      <style>{PLAYER_CSS}</style>
      {audio.image_url && (
        <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <img src={audio.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.20) saturate(0.3)" }} />
          <div className="absolute inset-0" style={{ background: "rgba(15,20,15,0.80)" }} />
        </div>
      )}
      <div className="relative z-[1] mx-auto flex min-h-full max-w-md flex-col px-5 pb-[env(safe-area-inset-bottom)] pt-[calc(1rem+env(safe-area-inset-top))]">
        {/* HEADER */}
        <div className="flex items-center justify-end gap-2">
          <div className="relative">
            <button onClick={() => setLangOpen((o) => !o)} className="flex h-9 items-center gap-1 rounded-full px-4 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.15)", color: "#F0EDE8" }} aria-haspopup="listbox" aria-expanded={langOpen}>
              {lang.toUpperCase()} <span aria-hidden>▾</span>
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute right-0 z-10 mt-2 w-24 overflow-hidden rounded-xl py-1" style={{ background: "#3A4236" }}>
                {LANGS.map((l) => (
                  <li key={l}><button onClick={() => { onLang(l); setLangOpen(false); }} className="block h-10 w-full px-4 text-left text-sm font-semibold" style={{ color: l === lang ? "#8FBF86" : "#F0EDE8" }}>{l.toUpperCase()}</button></li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={close} aria-label={tr("player.back")} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>

        {/* SPONSOR */}
        {sponsor && (
          <p className="mt-4 flex items-center justify-center gap-2 text-[13px]" style={{ color: "#F0EDE8" }}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]" style={{ background: "#2D5A27", color: "#F0EDE8" }}>✓</span>
            {tr("player.sponsor", { nom: sponsor })}
          </p>
        )}

        {/* META */}
        {meta && (
          <span className="mx-auto mt-6 rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)", color: "#F0EDE8" }}>{meta}</span>
        )}

        <h1 className="serif mx-auto my-4 max-w-[320px] text-center text-[36px] font-semibold leading-tight" style={{ color: "#FFFFFF" }}>{title}</h1>
        {desc && <p className="serif mx-auto max-w-[300px] text-center text-[15px] italic leading-[1.6]" style={{ color: "#C8C8C0" }}>« {desc} »</p>}

        {/* VOIX */}
        {hasVoices && voiced.length > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {voiced.map((t) => {
              const active = t.voix === trad?.voix;
              return (
                <button key={t.voix} onClick={() => pickVoice(t.voix!)} className="h-10 rounded-full px-5 text-sm font-medium"
                  style={active ? { background: "#2D5A27", color: "#F0EDE8" } : { background: "transparent", color: "rgba(240,237,232,0.50)" }}>
                  {active && <span style={{ color: "#8FBF86" }}>• </span>}{t.voix === "masculine" || t.voix === "M" ? tr("common.voice.masculine") : tr("common.voice.feminine")}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-8" />

        {/* PROGRESSION */}
        {trad && <audio ref={ref} src={trad.cloudinary_url ?? undefined} autoPlay preload="auto"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration || dur)} />}
        <div className="mt-8">
          <input type="range" min={0} max={dur || 1} step={0.5} value={time} aria-label={tr("player.progress")} className="seek"
            style={{ ["--p" as string]: `${pct}%` }}
            onChange={(e) => { const v = Number(e.target.value); setTime(v); if (ref.current) ref.current.currentTime = v; }} />
          <div className="mt-2 flex justify-between text-xs" style={{ color: "#9AA09A" }}><span>{mmss(time)}</span><span>{mmss(dur)}</span></div>
        </div>

        {/* CONTROLES */}
        <div className="mt-6 flex items-center justify-center gap-10">
          <button onClick={() => skip(-15)} aria-label={tr("player.skip.back")} className="flex flex-col items-center">
            <SkipIcon /><span className="text-[10px]" style={{ color: "#9AA09A" }}>15s</span>
          </button>
          <button onClick={toggle} aria-label={playing ? tr("player.pause") : tr("player.play")} className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
            style={{ background: "#2D5A27", boxShadow: "0 8px 24px rgba(45,90,39,0.40)" }}>
            {playing
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <PlayIcon size={24} color="#FFFFFF" />}
          </button>
          <button onClick={() => skip(15)} aria-label={tr("player.skip.fwd")} className="flex flex-col items-center">
            <SkipIcon forward /><span className="text-[10px]" style={{ color: "#9AA09A" }}>15s</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "#9AA09A" }}>
          <svg className="mr-1 inline-block align-[-2px]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA09A" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          {tr("player.screenlock")}<br />{tr("player.screenlockSub")}
        </p>

        {/* EN SUITE */}
        {next && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "rgba(255,255,255,0.10)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9AA09A" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#4A7A43" }}>{tr("player.next.label")}</p>
              <p className="serif truncate text-base" style={{ color: "#F0EDE8" }}>{titleOf(next, lang)}</p>
              <p className="text-xs" style={{ color: "#9AA09A" }}>{[next.type, fmt(next.duree_secondes)].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={() => onSelect(next)} aria-label={`${tr("spot.audio.listen")} ${titleOf(next, lang)}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <PlayIcon size={14} color="#F0EDE8" />
            </button>
          </div>
        )}

        {/* CTA */}
        <section className="mt-6 rounded-3xl p-6 text-center" style={{ background: "#F0EDE8" }}>
<p className="serif text-xl" style={{ color: "#1C2E1E" }}>{tr("player.cta.home")}</p>
          <p className="mt-2 text-sm" style={{ color: "#5A6B5C" }}>{tr("player.cta.calm")}</p>
          <a href={`/offres?spot_origine_id=${spotId}`} className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full text-sm font-semibold" style={{ background: "#2D5A27", color: "#F0EDE8" }}>
            {tr("player.cta.subscribe")}
          </a>
        </section>

        <p className="mx-auto mb-8 mt-6 flex items-center gap-1.5 text-[11px]" style={{ color: "#9AA09A" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#9AA09A" aria-hidden><path d="M20 4C10 4 4 10 4 18c0 .7.1 1.4.2 2C6 14 10 10 16 8c-5 3-8 7-9.5 12C14 20 20 14 20 4z" /></svg>
          Spots Zen · Immersions bien-être
        </p>
      </div>
    </div>
  );
}
