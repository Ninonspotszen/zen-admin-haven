import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LANGS = ["fr", "en", "de", "nl", "es"] as const;
const LOGO_LIGHT =
  "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-fonce.png";
const LOGO_DARK =
  "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-logo-transparent-clair.png";
const PICTO =
  "https://jgfwbyxxozkymyvkgihg.supabase.co/storage/v1/object/public/Images/SpotsZen-picto-vert.png";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Spots Zen" },
      { name: "description", content: "Créez votre compte ou connectez-vous à Spots Zen." },
      { property: "og:title", content: "Connexion — Spots Zen" },
      { property: "og:description", content: "Créez votre compte ou connectez-vous à Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnexionPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.5l6.2 5.3C41 35.4 44 30.2 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  );
}

function ConnexionPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    // Choix mémorisé (même clé que S1) ; sinon français par défaut, jamais deviné depuis le navigateur.
    const saved = localStorage.getItem("sz-lang");
    if (saved && (LANGS as readonly string[]).includes(saved)) setLang(saved);
  }, []);

  // Après connexion : abonné actif → /bibliotheque, sinon → /offres.
  // Dans abonnes_b2c, la colonne qui porte le compte est `id` (clé étrangère vers auth.users.id).
  async function routeAfterAuth(userId: string) {
    if (redirected.current) return;
    redirected.current = true;
    const { data: abo } = await supabase
      .from("abonnes_b2c")
      .select("id")
      .eq("id", userId)
      .eq("statut", "actif")
      .maybeSingle();
    navigate({ to: abo ? "/bibliotheque" : "/offres" });
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) void routeAfterAuth(session.user.id);
    });
    // Déjà connecté à l'ouverture du lien : on vérifie aussi.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void routeAfterAuth(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogle() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/bibliotheque" },
    });
    if (oauthError) setError("La connexion Google a échoué. Réessayez.");
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/bibliotheque" },
    });
    setSending(false);
    if (otpError) {
      setError("Impossible d'envoyer le lien. Vérifiez l'adresse email.");
      return;
    }
    setSentTo(email);
  }

  return (
    <div className="szc min-h-screen bg-[var(--szc-bg)] text-[var(--szc-fg)]">
      <style>{`
        .szc {
          --szc-bg: #F8F6F2; --szc-fg: #1C2E1E; --szc-muted: #5A6B5C;
          --szc-surface: #E8E4DC; --szc-brand: #2D5A27; --szc-on-brand: #F0EDE8;
          --szc-border: rgba(28,46,30,0.14); --szc-chip-border: rgba(28,46,30,0.25);
          --szc-menu-hover: rgba(45,90,39,0.08); --szc-badge: #EFE9DD;
          --background: 43 23% 96%; --card: 43 23% 96%; --popover: 43 23% 96%;
          --muted: 40 10% 89%; --secondary: 40 10% 89%; --accent: 40 10% 89%;
        }
        html.dark .szc {
          --szc-bg: #0F1410; --szc-fg: #F0EDE8; --szc-muted: #8B9B8B;
          --szc-surface: #1A211B; --szc-border: rgba(240,237,232,0.14);
          --szc-chip-border: rgba(240,237,232,0.30); --szc-menu-hover: rgba(240,237,232,0.08);
          --szc-badge: #1A211B;
          --background: 130 14% 7%; --card: 130 14% 7%; --popover: 130 14% 7%;
          --muted: 120 8% 12%; --secondary: 120 8% 12%; --accent: 120 8% 12%;
        }
        .szc .serif { font-family: "Playfair Display", serif; }
        .szc body, .szc main { background: var(--szc-bg); }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[var(--szc-bg)] px-4 py-3">
        <button
          onClick={() => window.history.back()}
          aria-label="Retour"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--szc-chip-border)] text-[var(--szc-fg)]"
        >
          ←
        </button>
        <img src={LOGO_LIGHT} alt="Spots Zen" className="h-8 w-auto object-contain dark:hidden" />
        <img src={LOGO_DARK} alt="Spots Zen" className="hidden h-8 w-auto object-contain dark:block" />
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex h-9 items-center gap-1 rounded-full border border-[var(--szc-chip-border)] bg-transparent px-4 text-sm font-semibold text-[var(--szc-fg)]"
            aria-haspopup="listbox"
            aria-expanded={langOpen}
          >
            {lang.toUpperCase()} <span aria-hidden>▾</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-11 z-30 w-28 overflow-hidden rounded-xl border border-[var(--szc-border)] bg-[var(--szc-bg)] shadow-lg" role="listbox">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); localStorage.setItem("sz-lang", l); i18n.changeLanguage(l); setLangOpen(false); }}
                  className={`block h-10 w-full px-4 text-left text-sm font-semibold hover:bg-[var(--szc-menu-hover)] ${l === lang ? "text-[var(--szc-brand)]" : "text-[var(--szc-fg)]"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-sm flex-col items-center px-6 pb-10 pt-8">
        {/* PICTO */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EBF2E9]">
          <img src={PICTO} alt="" className="h-11 w-11 object-contain" />
        </div>

        {/* TEXTE */}
        <h1 className="serif mt-6 text-center text-[26px] font-semibold leading-tight">Bienvenue sur Spots Zen</h1>
        <p className="mt-2 text-center text-sm text-[var(--szc-muted)]">Créez votre compte ou connectez-vous</p>

        {/* BOUTON GOOGLE */}
        <button
          onClick={handleGoogle}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--szc-border)] bg-white text-sm font-semibold text-[#1C2E1E] transition-colors hover:bg-[#F4F1EB]"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>

        {/* SÉPARATEUR */}
        <div className="mt-6 flex w-full items-center gap-4">
          <span className="h-px flex-1 bg-[var(--szc-border)]" />
          <span className="text-xs text-[var(--szc-muted)]">ou</span>
          <span className="h-px flex-1 bg-[var(--szc-border)]" />
        </div>

        {/* FORMULAIRE EMAIL */}
        {sentTo ? (
          <p className="mt-6 rounded-2xl bg-[var(--szc-surface)] px-5 py-4 text-center text-sm leading-relaxed text-[var(--szc-fg)]">
            Un lien de connexion a été envoyé à <strong>{sentTo}</strong>. Vérifiez votre boîte mail.
          </p>
        ) : (
          <form onSubmit={handleEmail} className="mt-6 w-full">
            <label htmlFor="email" className="text-sm font-medium text-[var(--szc-fg)]">
              Votre adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="mt-2 h-12 w-full rounded-full border border-[var(--szc-border)] bg-transparent px-5 text-sm text-[var(--szc-fg)] outline-none placeholder:text-[var(--szc-muted)] focus:border-[var(--szc-brand)]"
            />
            {error && <p className="mt-3 text-center text-sm text-[#B4452F]">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="mt-4 h-12 w-full rounded-full bg-[#2D5A27] text-sm font-semibold text-[#F0EDE8] transition-opacity disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Continuer avec mon email →"}
            </button>
          </form>
        )}

        {/* MENTIONS LÉGALES */}
        <p className="mt-8 text-center text-xs leading-relaxed text-[var(--szc-muted)]">
          En continuant, vous acceptez nos{" "}
          <a href="#" className="underline">Conditions d'utilisation</a> et notre{" "}
          <a href="#" className="underline">Politique de confidentialité</a>.
        </p>

        {/* BADGE */}
        <div className="mt-6 flex items-center gap-2 rounded-full bg-[var(--szc-badge)] px-5 py-2.5 text-xs font-medium text-[var(--szc-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Connexion instantanée et sécurisée
        </div>
      </main>
    </div>
  );
}
