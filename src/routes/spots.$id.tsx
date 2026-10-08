import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  }),
  component: SpotPage,
});

type Spot = { id: string; nom: string | null; description: string | null; photo_url: string | null; adresse: string | null; client_nom: string | null };
type Trad = { langue: string; voix: string | null; titre: string; description: string | null; cloudinary_url: string | null };
type Audio = { id: string; type: string | null; moment: string | null; image_url: string | null; duree_secondes: number | null; titre_fr: string | null; mis_en_avant: boolean | null; mis_en_avant_moment: string | null; traductions: Trad[] | null };

const LOGO = "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-clair.png";

function currentMoment() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Matin";
  if (h >= 12 && h < 17) return "Journée";
  if (h >= 17 && h < 22) return "Soir";
  return "Nuit";
}
function fmt(s: number | null) {
  if (!s) return "";
  return `${Math.round(s / 60)} min`;
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
  const [playing, setPlaying] = useState<{ audio: Audio; trad: Trad } | null>(null);

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
      if (visit?.premiere_visite && visit.duree_acces_jours) {
        const end = new Date(visit.premiere_visite).getTime() + visit.duree_acces_jours * 86400000;
        setDays(Math.max(0, Math.ceil((end - Date.now()) / 86400000)));
      }
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
    if (!ok) setPinError("Code incorrect. Il est affiché sur le totem.");
  }

  const moment = currentMoment();
  const featured = audios.find((a) => a.mis_en_avant && a.mis_en_avant_moment === moment);
  const others = audios.filter((a) => a !== featured);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 pb-32 pt-6">
        <img src={LOGO} alt="Spots Zen" className="mx-auto h-10" />
        {state === "loading" && <p className="mt-20 text-center text-muted-foreground">Chargement…</p>}
        {state === "notfound" && <Message title="Spot introuvable" text="Ce spot n'existe pas ou n'est plus actif." />}
        {state === "expired" && <Message title="Accès expiré" text="Votre période d'accès à ce spot est terminée. Abonnez-vous pour continuer à écouter." />}
        {spot && (state === "pin" || state === "catalog") && (
          <>
            {spot.photo_url && <img src={spot.photo_url} alt={spot.nom ?? ""} className="mt-6 aspect-[4/3] w-full rounded-3xl object-cover" />}
            <h1 className="mt-5 font-serif text-3xl font-medium">{spot.nom}</h1>
            {(spot.adresse || spot.client_nom) && <p className="mt-1 text-sm text-muted-foreground">{[spot.client_nom, spot.adresse].filter(Boolean).join(" · ")}</p>}
            {spot.description && <p className="mt-3 text-sm leading-relaxed">{spot.description}</p>}
            {days !== null && <span className="mt-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs">Accès offert · encore {days} jour{days > 1 ? "s" : ""}</span>}
          </>
        )}
        {state === "pin" && (
          <form onSubmit={submitPin} className="mt-8 rounded-3xl border bg-card p-6 text-center">
            <h2 className="font-serif text-xl">Entrez le code du spot</h2>
            <p className="mt-1 text-sm text-muted-foreground">4 chiffres, indiqués sur le totem.</p>
            <input
              inputMode="numeric" maxLength={4} value={pin} autoFocus
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mx-auto mt-5 block w-40 rounded-2xl border bg-background py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary"
              aria-label="Code PIN"
            />
            {pinError && <p className="mt-3 text-sm text-destructive">{pinError}</p>}
            <button disabled={checking} className="mt-5 w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
              {checking ? "Vérification…" : "Accéder aux audios"}
            </button>
          </form>
        )}
        {state === "catalog" && (
          <div className="mt-8 space-y-6">
            {featured && (
              <section>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Recommandé ce {moment.toLowerCase()}</p>
                <AudioCard audio={featured} big onPlay={(t) => setPlaying({ audio: featured, trad: t })} />
              </section>
            )}
            <section className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Tous les audios</p>
              {others.length === 0 && !featured && <p className="text-sm text-muted-foreground">Aucun audio disponible pour le moment.</p>}
              {others.map((a) => <AudioCard key={a.id} audio={a} onPlay={(t) => setPlaying({ audio: a, trad: t })} />)}
            </section>
          </div>
        )}
      </div>
      {playing && <Player key={playing.audio.id + (playing.trad.voix ?? "")} spotId={id} {...playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-20 text-center">
      <h1 className="font-serif text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function AudioCard({ audio, big, onPlay }: { audio: Audio; big?: boolean; onPlay: (t: Trad) => void }) {
  const fr = (audio.traductions ?? []).filter((t) => t.langue === "fr" && t.cloudinary_url);
  const title = fr[0]?.titre ?? audio.titre_fr ?? "Audio";
  const label = (v: string | null) => (v === "feminine" || v === "F" ? "Voix féminine" : v === "masculine" || v === "M" ? "Voix masculine" : "Écouter");
  return (
    <div className={`mt-2 flex gap-4 rounded-3xl border bg-card p-4 ${big ? "flex-col" : "items-center"}`}>
      {audio.image_url && <img src={audio.image_url} alt="" className={big ? "aspect-video w-full rounded-2xl object-cover" : "h-16 w-16 rounded-2xl object-cover"} />}
      <div className="flex-1">
        <p className="font-serif text-lg leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{[audio.type, fmt(audio.duree_secondes)].filter(Boolean).join(" · ")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fr.length === 0 && <span className="text-xs text-muted-foreground">Bientôt disponible</span>}
          {fr.map((t, i) => (
            <button key={i} onClick={() => onPlay(t)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              ▶ {label(t.voix)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Player({ audio, trad, spotId, onClose }: { audio: Audio; trad: Trad; spotId: string; onClose: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const logged = useRef(false);
  useEffect(() => {
    const el = ref.current;
    const log = () => {
      if (logged.current || !el || el.currentTime < 5) return;
      logged.current = true;
      void supabase.from("ecoutes").insert({
        audio_id: audio.id, spot_id: spotId, langue: trad.langue, voix: trad.voix, duree_ecoute_sec: Math.round(el.currentTime),
      });
    };
    el?.addEventListener("ended", log);
    window.addEventListener("pagehide", log);
    return () => { log(); el?.removeEventListener("ended", log); window.removeEventListener("pagehide", log); };
  }, [audio.id, spotId, trad]);
  return (
    <div className="fixed inset-x-0 bottom-0 border-t bg-card p-4 shadow-lg">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif">{trad.titre}</p>
          <audio ref={ref} src={trad.cloudinary_url ?? undefined} controls autoPlay className="mt-2 w-full" />
        </div>
        <button onClick={onClose} aria-label="Fermer" className="rounded-full px-3 py-2 text-muted-foreground">✕</button>
      </div>
    </div>
  );
}
