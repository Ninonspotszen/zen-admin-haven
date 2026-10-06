import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

type VoiceBlock = { titre: string; description: string; url: string };
const emptyVoice: VoiceBlock = { titre: "", description: "", url: "" };

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
  const [fem, setFem] = useState<VoiceBlock>(emptyVoice);
  const [masc, setMasc] = useState<VoiceBlock>(emptyVoice);

  const trads: { id: string; langue: string; voix: string | null; titre: string; description: string | null; cloudinary_url: string | null }[] =
    data?.audios_traductions ?? [];
  const femRow = trads.find((t) => t.langue === "fr" && t.voix === "feminine");
  const mascRow = trads.find((t) => t.langue === "fr" && t.voix === "masculine");
  const aucuneRow = trads.find((t) => t.langue === "fr" && t.voix === "aucune");

  useEffect(() => {
    if (!data) return;
    setF({
      titre: data.titre_fr ?? aucuneRow?.titre ?? "",
      type: data.type ?? "",
      moment: data.moment ?? "",
      public_cible: data.public_cible ?? "",
      duree: data.duree_secondes?.toString() ?? "",
      statut: data.statut ?? "brouillon",
      note: data.note_production ?? "",
    });
    setFem(femRow ? { titre: femRow.titre ?? "", description: femRow.description ?? "", url: femRow.cloudinary_url ?? "" } : emptyVoice);
    setMasc(mascRow ? { titre: mascRow.titre ?? "", description: mascRow.description ?? "", url: mascRow.cloudinary_url ?? "" } : emptyVoice);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
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

      // Synchronise le titre d'un éventuel enregistrement "aucune" (musique)
      if (aucuneRow && aucuneRow.titre !== f.titre) {
        const { error: eA } = await supabase.from("audios_traductions").update({ titre: f.titre }).eq("id", aucuneRow.id);
        if (eA) throw eA;
      }

      const upsertVoice = async (
        row: typeof femRow,
        voix: string,
        block: VoiceBlock,
        setBlock: (b: VoiceBlock) => void,
      ) => {
        const payload = { titre: block.titre, description: block.description || null, cloudinary_url: block.url || null };
        if (row) {
          const { error: e } = await supabase.from("audios_traductions").update(payload).eq("id", row.id);
          if (e) throw e;
        } else if (block.titre || block.description || block.url) {
          const { data: inserted, error: e } = await supabase
            .from("audios_traductions")
            .insert({ audio_id: id, langue: "fr", voix, ...payload })
            .select("id")
            .single();
          if (e) throw e;
          if (inserted) setBlock(block);
        }
      };

      await upsertVoice(femRow, "feminine", fem, setFem);
      await upsertVoice(mascRow, "masculine", masc, setMasc);
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

  const voiceBlock = (
    title: string,
    subtitle: string,
    block: VoiceBlock,
    setBlock: React.Dispatch<React.SetStateAction<VoiceBlock>>,
  ) => {
    const setV = (k: keyof VoiceBlock) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setBlock((p) => ({ ...p, [k]: e.target.value }));
    return (
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
        <div className="space-y-3">
          <div><label className={label}>Titre</label><input className={input} value={block.titre} onChange={setV("titre")} /></div>
          <div><label className={label}>Description</label><textarea rows={3} className={input} value={block.description} onChange={setV("description")} /></div>
          <div><label className={label}>URL Cloudinary</label><input className={input} value={block.url} onChange={setV("url")} /></div>
        </div>
      </div>
    );
  };

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

      <div className="mt-6 space-y-4">
        {voiceBlock("Voix féminine", "Version lue par la voix féminine", fem, setFem)}
        {voiceBlock("Voix masculine", "Version lue par la voix masculine", masc, setMasc)}
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
