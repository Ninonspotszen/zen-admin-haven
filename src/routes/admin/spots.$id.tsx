import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Download, ExternalLink, Sun, CloudSun, Sunset, Moon } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/spots/$id")({
  head: () => ({
    meta: [
      { title: "Configuration du spot · Spots Zen Admin" },
      { name: "description", content: "Programmation, accès, activité et QR code d'un spot." },
      { property: "og:title", content: "Configuration du spot · Spots Zen Admin" },
      { property: "og:description", content: "Programmation, accès, activité et QR code d'un spot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotConfig,
});

const CRENEAUX = [
  { key: "Matin", label: "Matin", heures: "6h – 12h", icon: Sun },
  { key: "Journée", label: "Journée", heures: "12h – 17h", icon: CloudSun },
  { key: "Soir", label: "Soir", heures: "17h – 22h", icon: Sunset },
  { key: "Nuit", label: "Nuit", heures: "22h – 6h", icon: Moon },
] as const;

function creneauForHour(h: number) {
  if (h >= 6 && h < 12) return "Matin";
  if (h >= 12 && h < 17) return "Journée";
  if (h >= 17 && h < 22) return "Soir";
  return "Nuit";
}

type SA = {
  id: string; ordre: number | null; mis_en_avant: boolean | null; mis_en_avant_moment: string | null;
  audio: { statut: string | null; titre_fr: string | null; audios_traductions: { langue: string; titre: string }[] } | null;
};
const titreOf = (a: SA) =>
  a.audio?.audios_traductions?.find((t) => t.langue === "fr")?.titre ?? a.audio?.titre_fr ?? "Sans titre";

const card = "rounded-2xl border bg-card p-6 space-y-4";
const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm";

function SpotConfig() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const spot = useQuery({
    queryKey: ["spot-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots").select("*, client:client_id(id, nom, duree_acces_jours, date_debut_acces)").eq("id", id).single();
      if (error) throw error;
      return data as typeof data & { client: { id: string; nom: string; duree_acces_jours: number | null; date_debut_acces: string | null } | null };
    },
  });

  const clientId = spot.data?.client_id ?? null;
  const catalogue = useQuery({
    queryKey: ["spot-catalogue", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_audios")
        .select("id, visible, audio:audio_id(statut, titre_fr, audios_traductions(langue, titre))")
        .eq("client_id", clientId!)
        .order("priorite");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; visible: boolean | null; audio: SA["audio"] }[];
    },
  });
  const toggleVisible = useMutation({
    mutationFn: async ({ caId, visible }: { caId: string; visible: boolean }) => {
      const { error } = await supabase.from("client_audios").update({ visible }).eq("id", caId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spot-catalogue", clientId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatut = useMutation({
    mutationFn: async (actif: boolean) => {
      const { error } = await supabase.from("spots").update({ statut: actif ? "actif" : "inactif" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spot-detail", id] }); qc.invalidateQueries({ queryKey: ["spots-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [note, setNote] = useState("");
  const [adresse, setAdresse] = useState("");
  useEffect(() => { setNote(spot.data?.note_interne ?? ""); setAdresse(spot.data?.adresse ?? ""); }, [spot.data]);
  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("spots").update({ note_interne: note || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Note enregistrée"); qc.invalidateQueries({ queryKey: ["spot-detail", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const audios = useQuery({
    queryKey: ["spot-audios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_audios")
        .select("id, ordre, mis_en_avant, mis_en_avant_moment, audio:audio_id(statut, titre_fr, audios_traductions(langue, titre))")
        .eq("spot_id", id).order("ordre");
      if (error) throw error;
      return (data ?? []) as unknown as SA[];
    },
  });

  const ecoutes = useQuery({
    queryKey: ["spot-ecoutes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecoutes").select("duree_ecoute_sec, timestamp, audio:audio_id(duree_secondes)")
        .eq("spot_id", id).limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as { duree_ecoute_sec: number | null; timestamp: string | null; audio: { duree_secondes: number | null } | null }[];
    },
  });

  // Section 1
  const [nom, setNom] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  useEffect(() => {
    if (spot.data) { setNom(spot.data.nom ?? ""); setShortUrl(spot.data.shortio_url ?? ""); }
  }, [spot.data]);
  const saveSpot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("spots").update({ nom: nom || null, shortio_url: shortUrl || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Spot sauvegardé"); qc.invalidateQueries({ queryKey: ["spot-detail", id] }); qc.invalidateQueries({ queryKey: ["spots-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Section 2
  const setFeatured = useMutation({
    mutationFn: async ({ moment, saId }: { moment: string; saId: string }) => {
      const r1 = await supabase.from("spot_audios").update({ mis_en_avant: false })
        .eq("spot_id", id).eq("mis_en_avant_moment", moment).neq("id", saId);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("spot_audios").update({ mis_en_avant: true, mis_en_avant_moment: moment }).eq("id", saId);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => { toast.success("Programmation mise à jour"); qc.invalidateQueries({ queryKey: ["spot-audios", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Section 3
  const [duree, setDuree] = useState("");
  useEffect(() => { setDuree(spot.data?.client?.duree_acces_jours?.toString() ?? ""); }, [spot.data]);
  const saveDuree = useMutation({
    mutationFn: async () => {
      const clientId = spot.data?.client?.id;
      if (!clientId) throw new Error("Aucun client associé à ce spot");
      const v = Number(duree);
      if (!Number.isInteger(v) || v < 1 || v > 90) throw new Error("La durée doit être comprise entre 1 et 90 jours");
      const { error } = await supabase.from("clients").update({ duree_acces_jours: v }).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Durée d'accès mise à jour pour tous les spots du client"); qc.invalidateQueries({ queryKey: ["spot-detail", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Section 4
  const stats = useMemo(() => {
    const rows = ecoutes.data ?? [];
    const total = rows.length;
    const durees = rows.map((r) => r.duree_ecoute_sec).filter((d): d is number => d != null);
    const moy = durees.length ? durees.reduce((a, b) => a + b, 0) / durees.length / 60 : 0;
    const ratios = rows
      .filter((r) => r.duree_ecoute_sec != null && r.audio?.duree_secondes)
      .map((r) => Math.min(1, r.duree_ecoute_sec! / r.audio!.duree_secondes!));
    const completion = ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100 : null;
    const parCreneau: Record<string, number> = { Matin: 0, Journée: 0, Soir: 0, Nuit: 0 };
    rows.forEach((r) => { if (r.timestamp) parCreneau[creneauForHour(new Date(r.timestamp).getHours())]!++; });
    return { total, moy, completion, parCreneau };
  }, [ecoutes.data]);

  // Section 5
  const [qrData, setQrData] = useState<string | null>(null);
  useEffect(() => {
    if (!shortUrl) { setQrData(null); return; }
    QRCode.toDataURL(shortUrl, { width: 512, margin: 2 }).then(setQrData).catch(() => setQrData(null));
  }, [shortUrl]);
  const slug = (spot.data?.slug || nom || "spot").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const download = (href: string, ext: string) => {
    const a = document.createElement("a"); a.href = href; a.download = `qr-${slug}.${ext}`; a.click();
  };
  const downloadSvg = async () => {
    const svg = await QRCode.toString(shortUrl, { type: "svg", margin: 2 });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(url, "svg"); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const shortioDashboard = (() => {
    try { const u = new URL(shortUrl); return `https://app.short.io/users/dashboard?search=${encodeURIComponent(u.host + u.pathname)}`; }
    catch { return "https://app.short.io"; }
  })();

  if (spot.isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (spot.error || !spot.data) return <p className="text-destructive">Spot introuvable.</p>;

  const now = creneauForHour(new Date().getHours());
  const maxCreneau = Math.max(1, ...Object.values(stats.parCreneau));

  return (
    <div className="space-y-6">
      <Link to="/admin/spots" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux spots
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{nom || "Spot sans nom"}</h1>
        <p className="text-sm text-muted-foreground">Client : {spot.data.client?.nom ?? "—"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Section 1 */}
          <section className={card}>
            <h2 className="font-serif text-xl">Infos spot</h2>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
              <div className="space-y-3">
                <label className="block space-y-1 text-sm">Nom du spot<input className={input} value={nom} onChange={(e) => setNom(e.target.value)} /></label>
                <label className="block space-y-1 text-sm">Lien Short.io<input className={input} value={shortUrl} onChange={(e) => setShortUrl(e.target.value)} placeholder="https://…" /></label>
                <p className="text-xs text-muted-foreground">Ce lien redirige dynamiquement les visiteurs vers l'application.</p>
                <button onClick={() => saveSpot.mutate()} disabled={saveSpot.isPending}
                  className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm disabled:opacity-50">
                  {saveSpot.isPending ? "Sauvegarde…" : "Sauvegarder"}
                </button>
              </div>
              {qrData && <img src={qrData} alt="QR code du spot" className="h-32 w-32 rounded-xl border" />}
            </div>
          </section>

          {/* Section 2 */}
          <section className={card}>
            <h2 className="font-serif text-xl">Programmation dynamique des audios</h2>
            <p className="text-sm text-muted-foreground">L'audio mis en avant change automatiquement selon l'heure de la visite.</p>
            {audios.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {CRENEAUX.map((c) => {
                  const list = audios.data ?? [];
                  const current = list.find((a) => a.mis_en_avant && a.mis_en_avant_moment === c.key);
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className={`rounded-xl border p-4 space-y-2 ${now === c.key ? "border-primary bg-primary/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-primary" />{c.label}</span>
                        <span className="text-xs text-muted-foreground">{c.heures}{now === c.key && " · en cours"}</span>
                      </div>
                      <p className="text-sm">{current ? titreOf(current) : <span className="text-muted-foreground">Aucun audio programmé</span>}</p>
                      <select value="" disabled={list.length === 0 || setFeatured.isPending} className={input}
                        onChange={(e) => e.target.value && setFeatured.mutate({ moment: c.key, saId: e.target.value })}>
                        <option value="">Changer d'audio…</option>
                        {list.map((a) => <option key={a.id} value={a.id}>{titreOf(a)}{a.audio?.statut === "brouillon" ? " (brouillon)" : ""}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
            {audios.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun audio lié à ce spot.</p>}
          </section>

          {/* Section 4 */}
          <section className={card}>
            <h2 className="font-serif text-xl">Activité du spot</h2>
            {ecoutes.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Écoutes cumulées" value={stats.total.toLocaleString("fr-FR")} />
                  <Stat label="Durée moyenne" value={`${stats.moy.toFixed(1).replace(".", ",")} min`} />
                  <Stat label="Taux de complétion" value={stats.completion == null ? "—" : `${Math.round(stats.completion)} %`} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Répartition par créneau</p>
                  {CRENEAUX.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 text-sm">
                      <span className="w-16">{c.label}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.parCreneau[c.key]! / maxCreneau) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{stats.parCreneau[c.key]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Section 3 */}
          <section className={card}>
            <h2 className="font-serif text-xl">Durée d'accès visiteurs</h2>
            <div className="flex gap-2 items-center">
              <input type="number" min={1} max={90} className={input} value={duree} onChange={(e) => setDuree(e.target.value)} disabled={!spot.data.client} />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
            <p className="text-xs text-muted-foreground">Durée commune à tous les spots de ce client · Configurable jusqu'à 90 jours selon l'abonnement</p>
            <button onClick={() => saveDuree.mutate()} disabled={saveDuree.isPending || !spot.data.client}
              className="rounded-full border px-5 py-2 text-sm disabled:opacity-50">Modifier</button>
          </section>

          {/* Section 5 */}
          <section className={card}>
            <h2 className="font-serif text-xl">QR code</h2>
            {qrData ? <img src={qrData} alt="QR code du spot" className="w-full max-w-[240px] mx-auto rounded-xl border" />
              : <p className="text-sm text-muted-foreground">Renseigne un lien Short.io pour générer le QR code.</p>}
            <p className="text-sm break-all text-center">{shortUrl || "—"}</p>
            <div className="grid gap-2">
              <button disabled={!shortUrl} onClick={() => navigator.clipboard.writeText(shortUrl).then(() => toast.success("Lien copié"))}
                className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50"><Copy className="h-4 w-4" />Copier le lien</button>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!qrData} onClick={() => qrData && download(qrData, "png")}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"><Download className="h-4 w-4" />PNG</button>
                <button disabled={!shortUrl} onClick={downloadSvg}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"><Download className="h-4 w-4" />SVG</button>
              </div>
              <a href={shortioDashboard} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm"><ExternalLink className="h-4 w-4" />Ouvrir sur Short.io</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-serif text-2xl">{value}</p>
    </div>
  );
}
