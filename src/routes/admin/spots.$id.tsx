import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/spots/$id")({
  head: () => ({
    meta: [
      { title: "Fiche spot · Spots Zen Admin" },
      { name: "description", content: "Configuration détaillée d'un spot." },
      { property: "og:title", content: "Fiche spot · Spots Zen Admin" },
      { property: "og:description", content: "Configuration détaillée d'un spot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotDetail,
});

const MOMENTS = ["Matin", "Journée", "Soir", "Nuit"];

type Form = {
  nom: string; description: string; photo_url: string; latitude: string;
  longitude: string; pin_code: string; shortio_url: string; statut: string;
};

type SA = {
  id: string; ordre: number | null; mis_en_avant: boolean | null;
  mis_en_avant_moment: string | null; audio_id: string | null;
  audio: { statut: string | null; titre_fr: string | null; audios_traductions: { langue: string; titre: string }[] } | null;
};

function SpotDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const spot = useQuery({
    queryKey: ["spot-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots").select("*, client:client_id(id, nom)").eq("id", id).single();
      if (error) throw error;
      return data as typeof data & { client: { id: string; nom: string } | null };
    },
  });

  const audios = useQuery({
    queryKey: ["spot-audios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_audios")
        .select("id, ordre, mis_en_avant, mis_en_avant_moment, audio_id, audio:audio_id(statut, titre_fr, audios_traductions(langue, titre))")
        .eq("spot_id", id)
        .order("ordre");
      if (error) throw error;
      return (data ?? []) as unknown as SA[];
    },
  });

  useEffect(() => {
    const s = spot.data;
    if (s) setForm({
      nom: s.nom ?? "", description: s.description ?? "", photo_url: s.photo_url ?? "",
      latitude: s.latitude?.toString() ?? "", longitude: s.longitude?.toString() ?? "",
      pin_code: s.pin_code ?? "", shortio_url: s.shortio_url ?? "", statut: s.statut ?? "actif",
    });
  }, [spot.data]);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
      const lat = num(f.latitude), lng = num(f.longitude);
      if ((lat !== null && isNaN(lat)) || (lng !== null && isNaN(lng))) throw new Error("Latitude/longitude invalides");
      const { error } = await supabase.from("spots").update({
        nom: f.nom || null, description: f.description || null, photo_url: f.photo_url || null,
        latitude: lat, longitude: lng, pin_code: f.pin_code || null,
        shortio_url: f.shortio_url || null, statut: f.statut,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Spot sauvegardé");
      qc.invalidateQueries({ queryKey: ["spot-detail", id] });
      qc.invalidateQueries({ queryKey: ["spots-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSA = useMutation({
    mutationFn: async (p: { id: string; patch: { ordre?: number; mis_en_avant?: boolean; mis_en_avant_moment?: string | null } }) => {
      const { error } = await supabase.from("spot_audios").update(p.patch).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spot-audios", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (spot.isLoading || !form) return <p className="text-muted-foreground">Chargement…</p>;
  if (spot.error) return <p className="text-destructive">Spot introuvable.</p>;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <Link to="/admin/spots" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux spots
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{form.nom || "Spot sans nom"}</h1>
          <p className="text-sm text-muted-foreground">Client : {spot.data?.client?.nom ?? "—"}</p>
        </div>
        <button onClick={() => save.mutate(form)} disabled={save.isPending}
          className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm disabled:opacity-50">
          {save.isPending ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      <section className="rounded-2xl border bg-card p-6 grid gap-4 md:grid-cols-2">
        <h2 className="font-serif text-xl md:col-span-2">Informations</h2>
        <label className="space-y-1 text-sm">Nom<input className={input} value={form.nom} onChange={set("nom")} /></label>
        <label className="space-y-1 text-sm">Statut
          <select className={input} value={form.statut} onChange={set("statut")}>
            <option value="actif">actif</option>
            <option value="inactif">inactif</option>
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">Description<textarea rows={3} className={input} value={form.description} onChange={set("description")} /></label>
        <label className="space-y-1 text-sm md:col-span-2">URL de la photo<input className={input} value={form.photo_url} onChange={set("photo_url")} /></label>
        {form.photo_url && <img src={form.photo_url} alt="" className="md:col-span-2 h-40 w-full object-cover rounded-xl" />}
        <label className="space-y-1 text-sm">Latitude<input className={input} value={form.latitude} onChange={set("latitude")} /></label>
        <label className="space-y-1 text-sm">Longitude<input className={input} value={form.longitude} onChange={set("longitude")} /></label>
        <label className="space-y-1 text-sm">Code PIN<input className={`${input} font-mono`} value={form.pin_code} onChange={set("pin_code")} /></label>
        <label className="space-y-1 text-sm">Lien court<input className={input} value={form.shortio_url} onChange={set("shortio_url")} /></label>
      </section>

      <section className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-serif text-xl">Audios du spot</h2>
        {audios.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> :
          (audios.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun audio lié.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Ordre</th><th>Titre</th><th>Statut</th><th>Mis en avant</th><th>Moment</th></tr>
            </thead>
            <tbody>
              {audios.data!.map((a) => {
                const titre = a.audio?.audios_traductions?.find((t) => t.langue === "fr")?.titre ?? a.audio?.titre_fr ?? "—";
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2">
                      <input type="number" defaultValue={a.ordre ?? 0} className="w-16 rounded-lg border bg-background px-2 py-1"
                        onBlur={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v !== a.ordre) updateSA.mutate({ id: a.id, patch: { ordre: v } }); }} />
                    </td>
                    <td>{titre}</td>
                    <td><span className={`px-3 py-1 rounded-full text-xs ${a.audio?.statut === "publié" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{a.audio?.statut ?? "—"}</span></td>
                    <td>
                      <button role="switch" aria-checked={!!a.mis_en_avant}
                        onClick={() => updateSA.mutate({ id: a.id, patch: { mis_en_avant: !a.mis_en_avant } })}
                        className={`relative h-6 w-11 rounded-full transition ${a.mis_en_avant ? "bg-primary" : "bg-muted"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${a.mis_en_avant ? "left-5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td>
                      <select value={a.mis_en_avant_moment ?? ""} className="rounded-lg border bg-background px-2 py-1"
                        onChange={(e) => updateSA.mutate({ id: a.id, patch: { mis_en_avant_moment: e.target.value || null } })}>
                        <option value="">—</option>
                        {MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
