import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/spots/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Spot Zen — Méditations audio" },
      { name: "description", content: "Écoutez les méditations, respirations et bains sonores de ce spot Spots Zen." },
      { property: "og:title", content: "Spot Zen — Méditations audio" },
      { property: "og:description", content: "Scannez, respirez, écoutez : votre pause bien-être Spots Zen." },
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
  component: SpotPage,
});

type Spot = { id: string; nom: string | null; description: string | null; photo_url: string | null; adresse: string | null; client_nom: string | null };
type Trad = { langue: string; voix: string | null; titre: string; description: string | null; cloudinary_url: string | null };
type Audio = { id: string; type: string | null; moment: string | null; image_url: string | null; duree_secondes: number | null; titre_fr: string | null; mis_en_avant: boolean | null; mis_en_avant_moment: string | null; traductions: Trad[] | null };

const LOGO_DARK = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-fonce.png";
const LANGS = ["fr", "en", "de", "nl", "es"] as const;

/* Palette scoped to this page (Spots Zen B2C brand), light + dark via .dark on <html>. */
const PAGE_CSS = `
html:has(.sz),.sz{--sz-bg:#F8F6F2;--sz-fg:#1C2E1E;--sz-muted:#6B7F6C;--sz-brand:#2D5A27;--sz-on-brand:#F8F6F2;--sz-chip:transparent;--sz-chip-fg:#1C2E1E;--sz-chip-border:#D8D2C5;--sz-hair:#D8D2C5;--sz-card:#F8F6F2;--sz-card-border:rgba(195,185,156,0.35);--sz-menu:#F8F6F2;--sz-menu-hover:#E8E4DC;--sz-bar:rgba(248,246,242,0.85);--sz-player:#F8F6F2;--sz-thumb:#EAF3E6;
font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;background:var(--sz-bg);color:var(--sz-fg)}
html.dark:has(.sz),html.dark .sz{--sz-bg:#0F1410;--sz-fg:#F8F6F2;--sz-muted:#A8B8A9;--sz-chip:transparent;--sz-chip-fg:#F8F6F2;--sz-chip-border:rgba(45,90,39,0.35);--sz-menu:#0F1410;--sz-menu-hover:#0F1410;--sz-hair:rgba(45,90,39,0.25);--sz-card:#0F1410;--sz-card-border:rgba(45,90,39,0.20);--sz-bar:rgba(15,20,16,0.85);--sz-player:#0F1410;--sz-thumb:rgba(45,90,39,0.25)}
.sz .serif{font-family:"Playfair Display",Georgia,serif}
.sz .noscroll{scrollbar-width:none}.sz .noscroll::-webkit-scrollbar{display:none}
html:has(.sz),.sz{--background:var(--sz-bg);--muted:var(--sz-bg);--secondary:var(--sz-bg);--accent:var(--sz-bg);--card:var(--sz-bg);--popover:var(--sz-bg);--foreground:var(--sz-fg);--card-foreground:var(--sz-fg);--popover-foreground:var(--sz-fg);--muted-foreground:var(--sz-muted);--secondary-foreground:var(--sz-fg);--accent-foreground:var(--sz-fg);--sz-play:#1C2E1E;--sz-placeholder:#C8C4BC}
html.dark:has(.sz),html.dark .sz{--sz-play:#FFFFFF}
body:has(.sz),.sz main,.sz section,.sz ul,.sz li{background:var(--sz-bg)}
.sz .audio-card,.sz .audio-copy{background:transparent}
.sz .audio-title{color:var(--sz-fg)}
.sz .audio-duration{color:var(--sz-muted)}
.sz .play-control{display:inline-flex;width:44px;height:44px;min-width:44px;flex-shrink:0;align-items:center;justify-content:center;border:1px solid var(--sz-play);border-radius:50%;background:transparent!important;color:var(--sz-play);padding:0;box-shadow:none}
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
const isMusic = (a: Audio) => a.type === "Musique" || (a.traductions ?? []).every((t) => !t.voix || t.voix === "aucune");
const voiceLabel = (v: string | null) => (v === "feminine" || v === "F" ? "Voix féminine" : v === "masculine" || v === "M" ? "Voix masculine" : "Sans voix");

function tradsFor(a: Audio, lang: string) {
  const all = (a.traductions ?? []).filter((t) => t.cloudinary_url);
  const inLang = all.filter((t) => t.langue === lang);
  return inLang.length ? inLang : all.filter((t) => t.langue === "fr");
}
function titleOf(a: Audio, lang: string) {
  return tradsFor(a, lang)[0]?.titre ?? a.titre_fr ?? "Audio";
}

function PlayIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
}

function SpotPage() {
  const { id } = Route.useParams();
  const [state, setState] = useState<"loading" | "notfound" | "expired" | "pin" | "catalog">("loading");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [checking, setChecking] = useState(false);
  const [lang, setLang] = useState("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [selected, setSelected] = useState<Audio | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("sz_lang");
    const nav = navigator.language.slice(0, 2);
    setLang(saved ?? ((LANGS as readonly string[]).includes(nav) ? nav : "en"));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_spot_public", { p_id: id });
      const s = (data as Spot[] | null)?.[0];
      if (!s) return setState("notfound");
      setSpot(s);
      let visitor = localStorage.getItem("sz_visitor");
      if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem("sz_visitor", visitor); }
      const { data: v } = await supabase.rpc("register_spot_visit", { p_id: id, p_visitor: visitor });
      const visit = v as { ok: boolean; reason?: string; premiere_visite?: string; duree_acces_jours?: number } | null;
      if (visit && !visit.ok) return setState(visit.reason === "acces_expire" ? "expired" : "notfound");
      if (visit?.duree_acces_jours) setDays(visit.duree_acces_jours);
      const saved = sessionStorage.getItem(`sz_pin_${id}`);
      if (saved && (await loadCatalog(saved))) return;
      setState("pin");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadCatalog(p: string) {
    const { data } = await supabase.rpc("get_spot_catalog", { p_id: id, p_pin: p });
    if (data === null || data === undefined) return false;
    setAudios((data as unknown as Audio[]) ?? []);
    sessionStorage.setItem(`sz_pin_${id}`, p);
    setState("catalog");
    return true;
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setPinError("Le code contient 4 chiffres.");
    setChecking(true); setPinError("");
    const ok = await loadCatalog(pin);
    setChecking(false);
    if (!ok) setPinError("Code incorrect. Vérifiez l'affichette.");
  }

  const moment = currentMoment();
  const playable = audios.filter((a) => tradsFor(a, lang).length > 0);
  const hero = playable.find((a) => a.mis_en_avant && a.mis_en_avant_moment === moment) ?? playable[0];
  const categories = ["Tous", "Visualisation", "Méditation", "Musique", "Respiration"];
  const match = (a: Audio) => filter === "Tous" || a.type === filter;
  const guided = audios.filter((a) => !isMusic(a) && match(a));
  const music = audios.filter((a) => isMusic(a) && match(a));

  return (
    <div className="sz min-h-screen pb-[env(safe-area-inset-bottom)]">
      <style>{PAGE_CSS}</style>

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-[rgba(195,185,156,0.25)] bg-[var(--sz-bar)] pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <img src={LOGO_DARK} alt="Spots Zen" className="h-8 w-auto object-contain" />
          <div className="relative">
            <button onClick={() => setLangOpen((o) => !o)} className="flex h-9 items-center gap-1 rounded-full border border-[var(--sz-chip-border)] bg-transparent px-4 text-sm font-semibold text-[var(--sz-chip-fg)]" aria-haspopup="listbox" aria-expanded={langOpen}>
              {lang.toUpperCase()} <span aria-hidden>▾</span>
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute right-0 mt-2 w-24 overflow-hidden rounded-xl border border-[var(--sz-hair)] bg-[var(--sz-menu)] py-1 shadow-[0_4px_16px_rgba(28,46,30,0.08)]">
                {LANGS.map((l) => (
                  <li key={l}>
                    <button onClick={() => { setLang(l); localStorage.setItem("sz_lang", l); setLangOpen(false); }} className={`block h-10 w-full px-4 text-left text-sm font-semibold hover:bg-[var(--sz-menu-hover)] ${l === lang ? "text-[var(--sz-brand)]" : "text-[var(--sz-fg)]"}`}>
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
        {state === "notfound" && <Message title="Spot indisponible" text="Ce spot n'est pas disponible pour le moment." />}
        {state === "expired" && <Message title="Accès expiré" text="Votre période d'accès à ce spot est terminée. Abonnez-vous pour continuer à écouter." />}

        {spot && (state === "pin" || state === "catalog") && (
          <p className="mt-4 text-xs leading-relaxed text-[var(--sz-muted)]">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#2D5A27] align-middle" />
            Offert par {spot.client_nom ?? spot.nom} ★★★★
            {days ? ` · Votre accès bien-être valable ${days} jours à compter de votre première visite` : ""}
          </p>
        )}

        {state === "pin" && (
          <form onSubmit={submitPin} className="mt-10 rounded-2xl border border-[var(--sz-card-border)] bg-[var(--sz-card)] p-6 text-center">
            <h2 className="serif text-xl font-medium">Entrez le code du spot</h2>
            <p className="mt-1 text-xs text-[var(--sz-muted)]">4 chiffres, indiqués sur l'affichette.</p>
            <input
              inputMode="numeric" maxLength={4} value={pin} autoFocus aria-label="Code PIN"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mx-auto mt-5 block w-40 rounded-2xl bg-[var(--sz-bg)] py-3 text-center text-2xl tracking-[0.5em] outline-none ring-1 ring-[var(--sz-hair)] focus:ring-2 focus:ring-[var(--sz-brand)]"
            />
            {pinError && <p className="mt-3 text-xs text-[#B3402A]">{pinError}</p>}
            <button disabled={checking} className="mt-5 h-12 w-full rounded-full bg-[var(--sz-brand)] text-sm font-semibold text-[var(--sz-on-brand)] disabled:opacity-60">
              {checking ? "Vérification…" : "Accéder aux audios"}
            </button>
          </form>
        )}

        {state === "catalog" && (
          <>
            {/* HERO */}
            {hero && (
              <button onClick={() => setSelected(hero)} className="relative mt-5 block aspect-video w-full overflow-hidden rounded-2xl text-left" aria-label={`Écouter ${titleOf(hero, lang)}`}>
                {hero.image_url ? <img src={hero.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><span className="missing-image" aria-hidden>♪</span></div>}
                {hero.image_url && <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(15,20,16,0.85)_100%)]" />}
                {hero.mis_en_avant_moment && <span className="tag absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold">⏱ {hero.mis_en_avant_moment}</span>}
                <span className="play-control absolute right-3 top-3"><PlayIcon /></span>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="serif text-[22px] font-medium leading-tight text-[#F0EDE8]">{titleOf(hero, lang)}</p>
                  <p className="text-xs text-[rgba(240,237,232,0.75)]">{[fmt(hero.duree_secondes), hero.type].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            )}

            {/* FILTRES */}
            <div className="noscroll -mx-5 mt-10 flex gap-2 overflow-x-auto px-5">
              {categories.map((c) => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`shrink-0 rounded-full border px-5 py-2 text-xs font-semibold ${c === filter ? "border-[var(--sz-brand)] bg-[var(--sz-brand)] text-[var(--sz-on-brand)]" : "border-[var(--sz-chip-border)] bg-transparent text-[var(--sz-chip-fg)]"}`}>
                  {c}
                </button>
              ))}
            </div>

            {/* IMMERSIONS */}
            {guided.length > 0 && (
              <section className="mt-10">
                <Eyebrow>Immersions guidées</Eyebrow>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {guided.map((a) => (
                    <button key={a.id} onClick={() => setSelected(a)} className="audio-card rounded-2xl text-left">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                        {a.image_url ? <img src={a.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><span className="missing-image" aria-hidden>♪</span></div>}
                        
                        {a.mis_en_avant_moment && <span className="tag absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold">{a.mis_en_avant_moment}</span>}
                        <span className="play-control absolute bottom-3 right-3"><PlayIcon /></span>
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
                <Eyebrow>Musiques relaxantes</Eyebrow>
                <p className="mt-1 text-xs text-[var(--sz-muted)]">Avec fréquences binaurales · sans voix.</p>
                <ul className="mt-3">
                  {music.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 border-b border-[var(--sz-hair)] py-3 last:border-b-0">
                      <Thumb audio={a} />
                      <div className="audio-copy min-w-0 flex-1">
                        <p className="audio-title truncate text-sm font-semibold">{titleOf(a, lang)}</p>
                        <p className="audio-duration text-xs">{fmt(a.duree_secondes)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelected(a)} aria-label={`Écouter ${titleOf(a, lang)}`} className="play-control"><PlayIcon /></Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {guided.length === 0 && music.length === 0 && <p className="mt-10 text-center text-sm text-[var(--sz-muted)]">Aucun audio disponible pour le moment.</p>}
          </>
        )}
      </main>

      {/* LIGHT ISLAND */}
      {state === "catalog" && (
        <div className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"><section className="rounded-3xl bg-[var(--sz-bg)] px-5 py-8 text-center">
          <p className="serif whitespace-nowrap text-lg font-medium text-[var(--sz-fg)]">Retrouvez ces audios chez vous ♡</p>
          <a href={`/offres?spot_origine_id=${id}`} className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-[#2D5A27] text-sm font-semibold text-[#F0EDE8]">
            Abonnez-vous à Spots Zen →
          </a>
          </section>{selected && <div className="h-44" />}</div>
      )}

      {selected && <Player key={selected.id} audio={selected} lang={lang} spotId={id} onClose={() => setSelected(null)} />}
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

function Player({ audio, lang, spotId, onClose }: { audio: Audio; lang: string; spotId: string; onClose: () => void }) {
  const trads = tradsFor(audio, lang);
  const voiced = trads.filter((t) => t.voix && t.voix !== "aucune");
  const savedVoice = typeof localStorage !== "undefined" ? localStorage.getItem("sz_voice") : null;
  const [trad, setTrad] = useState<Trad | null>(voiced.length > 1 ? null : trads[0] ?? null);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(audio.duree_secondes ?? 0);
  const logged = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !trad) return;
    const log = () => {
      if (logged.current || el.currentTime < 5) return;
      logged.current = true;
      void supabase.from("ecoutes").insert({ audio_id: audio.id, spot_id: spotId, langue: trad.langue, voix: trad.voix, duree_ecoute_sec: Math.round(el.currentTime) });
      const visitor = localStorage.getItem("sz_visitor");
      if (visitor) void supabase.rpc("register_spot_visit", { p_id: spotId, p_visitor: visitor });
    };
    const onTime = () => { setTime(el.currentTime); log(); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", log);
    window.addEventListener("pagehide", log);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: trad.titre, artist: "Spots Zen", artwork: audio.image_url ? [{ src: audio.image_url }] : [] });
    }
    return () => { el.removeEventListener("timeupdate", onTime); el.removeEventListener("ended", log); window.removeEventListener("pagehide", log); };
  }, [audio.id, audio.image_url, spotId, trad]);

  const toggle = () => { const el = ref.current; if (!el) return; if (el.paused) void el.play(); else el.pause(); };
  const skip = (d: number) => { const el = ref.current; if (el) el.currentTime = Math.max(0, Math.min(el.duration || dur, el.currentTime + d)); };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const title = trad?.titre ?? titleOf(audio, lang);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-[var(--sz-player)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_30px_rgba(15,20,16,0.15)]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <Thumb audio={audio} />
          <div className="audio-copy min-w-0 flex-1">
            <p className="serif truncate text-base font-medium">{title}</p>
            <p className="text-xs text-[var(--sz-muted)]">{trad ? voiceLabel(trad.voix) : "Choisissez une voix"}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--sz-muted)]">✕</button>
        </div>

        {!trad ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {voiced.map((t, i) => (
              <button key={i} onClick={() => { localStorage.setItem("sz_voice", t.voix ?? ""); setTrad(t); }}
                className={`h-12 rounded-full bg-[#EAF3E6] text-sm font-semibold text-[#2D5A27] ${t.voix === savedVoice ? "ring-2 ring-[#2D5A27]" : ""}`}>
                {voiceLabel(t.voix)}
              </button>
            ))}
          </div>
        ) : (
          <>
            <audio ref={ref} src={trad.cloudinary_url ?? undefined} autoPlay
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration || dur)} />
            <input type="range" min={0} max={dur || 1} step={1} value={time} aria-label="Progression"
              onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }}
              className="mt-4 w-full" />
            <div className="flex justify-between text-[11px] text-[var(--sz-muted)]"><span>{mmss(time)}</span><span>{mmss(dur)}</span></div>
            <div className="mt-2 flex items-center justify-center gap-6">
              <button onClick={() => skip(-15)} aria-label="Reculer de 15 secondes" className="flex h-11 w-11 items-center justify-center rounded-full text-lg">◀◀</button>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} className="play-control">
                {playing ? <span className="text-lg font-semibold">❚❚</span> : <PlayIcon />}
              </Button>
              <button onClick={() => skip(15)} aria-label="Avancer de 15 secondes" className="flex h-11 w-11 items-center justify-center rounded-full text-lg">▶▶</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
