import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./video-modal.css";

const VIDEO_ID = "41lpqo0Bun4";

export function VideoButton({ time, label, className, style, children }: { time?: number; label: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0${time ? `&start=${time}` : ""}`;
  const watchUrl = `https://youtu.be/${VIDEO_ID}${time ? `?t=${time}` : ""}`;
  return <>
    <button type="button" className={`sz-video-trigger${className ? ` ${className}` : ""}`} style={style} aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>{children}</button>
    {open && createPortal(
      <div className="sz-video-overlay" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
        <div className="sz-video-box" onClick={event => event.stopPropagation()}>
          <button type="button" className="sz-video-close" aria-label="Fermer la vidéo" onClick={() => setOpen(false)}><X size={20} aria-hidden /></button>
          <iframe src={embedUrl} title={label} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          <a className="sz-video-fallback" href={watchUrl} target="_blank" rel="noopener noreferrer">Si la vidéo ne se lance pas, l'ouvrir sur YouTube</a>
        </div>
      </div>, document.body)}
  </>;
}
