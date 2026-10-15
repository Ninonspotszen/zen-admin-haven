import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/* ------------------------------------------------------------------ */
/* Écoutes : une ligne par écoute, envoyée à la fin avec la vraie durée */
/* ------------------------------------------------------------------ */

const MIN_ECOUTE_SEC = 5;

/**
 * Mesure le temps réellement écouté (lecture en cours, hors sauts dans la barre)
 * et enregistre UNE ligne dans `ecoutes` quand l'écoute se termine : fin de l'audio,
 * fermeture du lecteur, passage à un autre audio, ou fermeture de la page.
 * La table n'accepte que des ajouts (pas de modification) : on écrit donc une seule fois.
 * Écoutes anonymes : aucun identifiant d'utilisateur n'est enregistré.
 */
export function useListenLog(
  ref: RefObject<HTMLAudioElement | null>,
  opts: { audioId: string; spotId: string | null; langue: string | null | undefined; voix: string | null | undefined },
) {
  const listened = useRef(0);
  const sent = useRef(false);
  const meta = useRef(opts);
  meta.current = opts;

  const flush = useCallback(() => {
    if (sent.current) return;
    const duree = Math.round(listened.current);
    if (duree < MIN_ECOUTE_SEC) return;
    sent.current = true;
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return;
    const m = meta.current;
    // keepalive : l'envoi aboutit même si la page se ferme juste après.
    void fetch(`${url}/rest/v1/ecoutes`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ audio_id: m.audioId, spot_id: m.spotId, langue: m.langue ?? null, voix: m.voix ?? null, duree_ecoute_sec: duree }),
    }).catch(() => { /* réseau indisponible : écoute non comptée */ });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = el.currentTime;
    const onTime = () => {
      const delta = el.currentTime - last;
      last = el.currentTime;
      // Seuls les petits pas de lecture comptent : un saut dans la barre n'est pas une écoute.
      if (!el.paused && delta > 0 && delta < 2) listened.current += delta;
    };
    const onSeeked = () => { last = el.currentTime; };
    const onHide = () => { if (document.visibilityState === "hidden" && el.paused) flush(); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("ended", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("ended", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush(); // fermeture du lecteur ou passage à un autre audio
    };
  }, [ref, flush]);
}

/* ------------------------------------------------------------------ */
/* État du réseau et du chargement audio                               */
/* ------------------------------------------------------------------ */

export type AudioStatus = "ok" | "loading" | "slow" | "offline" | "error";

const LOADING_DELAY_MS = 1000; // évite un clignotement pour un chargement rapide
const SLOW_DELAY_MS = 8000;
const RESUME_REWIND_SEC = 3; // reprise un peu avant la coupure, pour ne pas couper un mot

/**
 * Surveille le lecteur et la connexion. Renvoie l'état à afficher et une fonction « Réessayer ».
 * Au retour du réseau, l'immersion reprend automatiquement 3 secondes avant la coupure.
 */
export function useAudioStatus(ref: RefObject<HTMLAudioElement | null>, src: string | null | undefined) {
  const [status, setStatus] = useState<AudioStatus>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "ok",
  );
  const statusRef = useRef<AudioStatus>(status);
  statusRef.current = status;
  const timers = useRef<number[]>([]);
  const resumeAt = useRef<number | null>(null);
  const shouldPlay = useRef(true); // le lecteur démarre en lecture automatique

  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };

  const startWaiting = useCallback(() => {
    clearTimers();
    timers.current.push(window.setTimeout(() => setStatus((s) => (s === "ok" ? "loading" : s)), LOADING_DELAY_MS));
    timers.current.push(window.setTimeout(() => setStatus((s) => (s === "loading" || s === "ok" ? "slow" : s)), SLOW_DELAY_MS));
  }, []);

  const reload = useCallback((play: boolean) => {
    const el = ref.current;
    if (!el) return;
    const from = Math.max(0, (resumeAt.current ?? el.currentTime) - RESUME_REWIND_SEC);
    resumeAt.current = null;
    setStatus("ok");
    startWaiting();
    const onMeta = () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.currentTime = from;
      if (play) void el.play().catch(() => { /* lecture bloquée par le navigateur : l'utilisateur relancera */ });
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.load();
  }, [ref, startWaiting]);

  const retry = useCallback(() => reload(true), [reload]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ready = () => { clearTimers(); setStatus((s) => (s === "offline" ? s : "ok")); };
    const onPlay = () => { shouldPlay.current = true; };
    const onPause = () => { if (navigator.onLine !== false && !el.error) shouldPlay.current = false; };
    const onStalled = () => { if (el.readyState < 3) startWaiting(); };
    const onError = () => {
      clearTimers();
      resumeAt.current = el.currentTime;
      setStatus(navigator.onLine === false ? "offline" : "error");
    };
    const onOffline = () => { clearTimers(); resumeAt.current = el.currentTime; setStatus("offline"); };
    const onOnline = () => {
      if (statusRef.current === "offline" || statusRef.current === "error") reload(shouldPlay.current);
    };

    el.addEventListener("loadstart", startWaiting);
    el.addEventListener("waiting", startWaiting);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("playing", ready);
    el.addEventListener("canplay", ready);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("error", onError);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimers();
      el.removeEventListener("loadstart", startWaiting);
      el.removeEventListener("waiting", startWaiting);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("playing", ready);
      el.removeEventListener("canplay", ready);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("error", onError);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [ref, src, startWaiting, reload]);

  return { status, retry };
}
