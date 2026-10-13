import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/admin/audios/$id")({
  head: () => ({
    meta: [
      { title: "Fiche audio — Spots Zen Admin" },
      { name: "description", content: "Détail et édition d'un audio Spots Zen." },
      { property: "og:title", content: "Fiche audio — Spots Zen Admin" },
      { property: "og:description", content: "Détail et édition d'un audio Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AudioDetail,
});

type VoiceBlock = { id?: string; titre: string; description: string; url: string };
type LangState = { feminine: VoiceBlock; masculine: VoiceBlock; aucune: { id?: string; titre: string } };
const LANGS = ["fr", "en", "de", "nl", "es"] as const;
type Lang = (typeof LANGS)[number];
const LANG_NAMES: Record<Lang, string> = { fr: "FR", en: "EN", de: "DE", nl: "NL", es: "ES" };
const VOIX_LABEL = { feminine: "féminine", masculine: "masculine" } as const;
const emptyVoice: VoiceBlock = { titre: "", description: "", url: "" };
const emptyLang = (): LangState => ({ feminine: { ...emptyVoice }, masculine: { ...emptyVoice }, aucune: { titre: "" } });
const emptyAll = () => Object.fromEntries(LANGS.map((l) => [l, emptyLang()])) as Record<Lang, LangState>;

const voiceSchema = z
  .object({ titre: z.string().trim().max(300), description: z.string().max(5000), url: z.string().trim().max(1000) })
  .superRefine((v, ctx) => {
    if (v.url) {
      if (!v.titre) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "titre obligatoire si une URL est renseignée" });
      if (!v.url.startsWith("https://")) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "l'URL doit commencer par https://" });
    }
  });

function AudioDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["audio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audios")
        .select("*, audios_traductions(id, langue, titre, voix, description, cloudinary_url)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [f, setF] = useState({ titre: "", type: "", moment: "", public_cible: "", duree: "", statut: "brouillon", note: "" });
  const [tr, setTr] = useState<Record<Lang, LangState>>(emptyAll);
  const [lang, setLang] = useState<Lang>("fr");

  const trads: { id: string; langue: string; voix: string | null; titre: string; description: string | null; cloudinary_url: string | null }[] =
    data?.audios_traductions ?? [];
  const aucuneRowFr = trads.find((t) => t.langue === "fr" && t.voix === "aucune");
  const isMusic = trads.some((t) => t.voix === "aucune") || (data?.type ?? "").toLowerCase() === "musique";

  useEffect(() => {
    if (!data) return;
    setF({
      titre: data.titre_fr ?? aucuneRowFr?.titre ?? "",
      type: data.type ?? "",
      moment: data.moment ?? "",
      public_cible: data.public_cible ?? "",
      duree: data.duree_secondes?.toString() ?? "",
      statut: data.statut ?? "brouillon",
      note: data.note_production ?? "",
    });
    const next = emptyAll();
    for (const t of trads) {
      if (!(LANGS as readonly string[]).includes(t.langue)) continue;
      const L = next[t.langue as Lang];
      if (t.voix === "feminine" || t.voix === "masculine") {
        L[t.voix] = { id: t.id, titre: t.titre ?? "", description: t.description ?? "", url: t.cloudinary_url ?? "" };
      } else if (t.voix === "aucune") {
        L.aucune = { id: t.id, titre: t.titre ?? "" };
      }
    }
    setTr(next);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = (l: Lang) => (tr[l].feminine.url.trim() ? 1 : 0) + (tr[l].masculine.url.trim() ? 1 : 0);
  const incomplete = !isMusic
    ? LANGS.filter((l) => l !== "fr" && progress(l) === 1).map((l) => ({
        l,
        missing: tr[l].feminine.url.trim() ? VOIX_LABEL.masculine : VOIX_LABEL.feminine,
      }))
    : [];

  const save = useMutation({
    mutationFn: async () => {
      // Validation de toutes les langues/voix avant écriture
      if (!isMusic) {
        for (const l of LANGS) {
          for (const v of ["feminine", "masculine"] as const) {
            const r = voiceSchema.safeParse(tr[l][v]);
            if (!r.success) throw new Error(`${LANG_NAMES[l]} · voix ${VOIX_LABEL[v]} : ${r.error.issues[0]?.message ?? "invalide"}`);
          }
        }
      }

      const { error } = await supabase
        .from("audios")
        .update({
          titre_fr: f.titre,
          type: f.type || null,
          moment: f.moment || null,
          public_cible: f.public_cible || null,
          duree_secondes: f.duree ? Number(f.duree) : null,
          statut: f.statut,
          note_production: f.note || null,
        })
        .eq("id", id);
      if (error) throw error;

      // Synchronise le titre d'un éventuel enregistrement "aucune" (musique) en FR
      if (aucuneRowFr && aucuneRowFr.titre !== f.titre) {
        const { error: eA } = await supabase.from("audios_traductions").update({ titre: f.titre }).eq("id", aucuneRowFr.id);
        if (eA) throw new Error(`FR · aucune : ${eA.message}`);
      }

      for (const l of LANGS) {
        if (isMusic) {
          if (l === "fr") continue;
          const a = tr[l].aucune;
          const titre = a.titre.trim();
          if (a.id) {
            const { error: e } = await supabase.from("audios_traductions").update({ titre }).eq("id", a.id);
            if (e) throw new Error(`${LANG_NAMES[l]} · titre traduit : ${e.message}`);
          } else if (titre) {
            const { error: e } = await supabase.from("audios_traductions").insert({ audio_id: id, langue: l, voix: "aucune", titre });
            if (e) throw new Error(`${LANG_NAMES[l]} · titre traduit : ${e.message}`);
          }
          continue;
        }
        for (const v of ["feminine", "masculine"] as const) {
          const b = tr[l][v];
          const payload = { titre: b.titre.trim(), description: b.description || null, cloudinary_url: b.url.trim() || null };
          const where = `${LANG_NAMES[l]} · voix ${VOIX_LABEL[v]}`;
          if (b.id) {
            const { error: e } = await supabase.from("audios_traductions").update(payload).eq("id", b.id);
            if (e) throw new Error(`${where} : ${e.message}`);
          } else if (b.titre.trim() || b.description.trim() || b.url.trim()) {
            const { error: e } = await supabase.from("audios_traductions").insert({ audio_id: id, langue: l, voix: v, ...payload });
            if (e) throw new Error(`${where} : ${e.message}`);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Modifications enregistrées");
      qc.invalidateQueries({ queryKey: ["audio", id] });
      qc.invalidateQueries({ queryKey: ["audios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (error || !data) return <p className="text-destructive">Audio introuvable.</p>;

  const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
  const label = "mb-1 block text-xs font-semibold text-muted-foreground";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const voiceBlock = (title: string, subtitle: string, v: "feminine" | "masculine") => {
    const block = tr[lang][v];
    const setV = (k: "titre" | "description" | "url") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setTr((p) => ({ ...p, [lang]: { ...p[lang], [v]: { ...p[lang][v], [k]: val } } }));
    };
    return (
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
        <div className="space-y-3">
          <div><label className={label}>Titre</label><input className={input} value={block.titre} onChange={setV("titre")} /></div>
          <div><label className={label}>Description</label><textarea rows={3} className={input} value={block.description} onChange={setV("description")} /></div>
          <div><label className={label}>URL Cloudinary</label><input className={input} value={block.url} onChange={setV("url")} placeholder="https://" /></div>
        </div>
      </div>
    );
  };

  const pill = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;
  const badge = (n: number, total: number) =>
    `rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
      n === total ? "bg-green-100 text-green-800" : n > 0 ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground"
    }`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/audios" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Bibliothèque audio
      </Link>
      <h1 className="font-serif text-3xl font-bold text-foreground">{f.titre || "Sans titre"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.reference_interne ? `#${data.reference_interne}` : ""} · {trads.length} version(s)
      </p>

      <div className="mt-6 grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Titre (français)</label><input className={input} value={f.titre} onChange={set("titre")} /></div>
        <div><label className={label}>Type</label><input className={input} value={f.type} onChange={set("type")} /></div>
        <div><label className={label}>Moment</label><input className={input} value={f.moment} onChange={set("moment")} /></div>
        <div><label className={label}>Public</label><input className={input} value={f.public_cible} onChange={set("public_cible")} /></div>
        <div><label className={label}>Durée (secondes)</label><input type="number" min={0} className={input} value={f.duree} onChange={set("duree")} /></div>
        <div>
          <label className={label}>Statut</label>
          <select className={input} value={f.statut} onChange={set("statut")}>
            <option value="brouillon">Brouillon</option>
            <option value="publié">Publié</option>
          </select>
        </div>
        <div className="sm:col-span-2"><label className={label}>Note de production</label><textarea rows={3} className={input} value={f.note} onChange={set("note")} /></div>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-full border bg-card p-1 w-fit">
        {LANGS.map((l) => {
          const n = isMusic ? (l === "fr" ? (f.titre.trim() ? 1 : 0) : tr[l].aucune.titre.trim() ? 1 : 0) : progress(l);
          const total = isMusic ? 1 : 2;
          return (
            <button key={l} type="button" onClick={() => setLang(l)} className={pill(lang === l)}>
              {LANG_NAMES[l]}
              <span className={badge(n, total)}>{n}/{total}</span>
            </button>
          );
        })}
      </div>

      {incomplete.length > 0 && (
        <div className="mt-3 space-y-1">
          {incomplete.map(({ l, missing }) => (
            <p key={l} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
              Traduction {LANG_NAMES[l]} incomplète : il manque la voix {missing}. Les visiteurs dans cette langue ne verront qu'une seule voix tant qu'elle n'est pas ajoutée.
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {isMusic ? (
          lang === "fr" ? (
            <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              Musique : le titre français se modifie dans le champ « Titre (français) » ci-dessus. Le fichier musical est le même dans toutes les langues.
            </p>
          ) : (
            <div className="rounded-2xl border bg-card p-5">
              <label className={label}>Titre traduit ({LANG_NAMES[lang]})</label>
              <input
                className={input}
                value={tr[lang].aucune.titre}
                onChange={(e) => {
                  const val = e.target.value;
                  setTr((p) => ({ ...p, [lang]: { ...p[lang], aucune: { ...p[lang].aucune, titre: val } } }));
                }}
              />
            </div>
          )
        ) : (
          <>
            {voiceBlock("Voix féminine", `Version ${LANG_NAMES[lang]} lue par la voix féminine`, "feminine")}
            {voiceBlock("Voix masculine", `Version ${LANG_NAMES[lang]} lue par la voix masculine`, "masculine")}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {save.isPending ? "Enregistrement…" : "Sauvegarder les modifications"}
        </button>
      </div>
    </div>
  );
}
