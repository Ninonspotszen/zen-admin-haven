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
  audio: { id: string; statut: string | null; titre_fr: string | null; groupe_slug: string | null; audios_traductions: { langue: string; titre: string }[] } | null;
};
const titreOf = (a: SA) =>
  a.audio?.audios_traductions?.find((t) => t.langue === "fr")?.titre ?? a.audio?.titre_fr ?? "Sans titre";
// Chaque audio guidé = un seul audio_id ; les voix F/M vivent dans audios_traductions sous ce même audio_id
const audioIdOf = (a: SA) => a.audio?.id ?? "";

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
        .select("id, ordre, mis_en_avant, mis_en_avant_moment, audio:audio_id(id, statut, titre_fr, groupe_slug, audios_traductions(langue, titre))")
        .eq("audio.audios_traductions.langue", "fr")
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
      const { error } = await supabase.from("spots").update({ nom: nom || null, adresse: adresse || null, shortio_url: shortUrl || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Spot sauvegardé"); qc.invalidateQueries({ queryKey: ["spot-detail", id] }); qc.invalidateQueries({ queryKey: ["spots-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Section 2
  const setFeatured = useMutation({
    mutationFn: async ({ moment, audioId }: { moment: string; audioId: string }) => {
      const ids = (audios.data ?? []).filter((a) => audioIdOf(a) === audioId).map((a) => a.id);
      if (ids.length === 0) throw new Error("Audio introuvable");
      const r1 = await supabase.from("spot_audios").update({ mis_en_avant: false })
        .eq("spot_id", id).eq("mis_en_avant_moment", moment);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("spot_audios").update({ mis_en_avant: true, mis_en_avant_moment: moment }).in("id", ids);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => { toast.success("Programmation mise à jour"); qc.invalidateQueries({ queryKey: ["spot-audios", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Section 3 — paramètres d'accès (lecture seule)
  const dureeJours = spot.data?.client?.duree_acces_jours ?? null;
  const debut = spot.data?.client?.date_debut_acces ?? null;
  const fin = debut && dureeJours != null
    ? new Date(new Date(debut).getTime() + dureeJours * 86400000)
    : null;

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

  // Section Accès & QR — URL PWA spotszen.fr/spot/[slug]
  const slug = (spot.data?.slug || nom || "spot").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const pwaUrl = `https://spotszen.fr/spot/${slug}`;
  const [qrData, setQrData] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(pwaUrl, { width: 512, margin: 2 }).then(setQrData).catch(() => setQrData(null));
  }, [pwaUrl]);
  const downloadPng = () => {
    if (!qrData) return;
    const a = document.createElement("a"); a.href = qrData; a.download = `qr-${slug}.png`; a.click();
  };

  if (spot.isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (spot.error || !spot.data) return <p className="text-destructive">Spot introuvable.</p>;

  const now = creneauForHour(new Date().getHours());
  const maxCreneau = Math.max(1, ...Object.values(stats.parCreneau));

  return (
    <div className="space-y-6">
      <Link to="/admin/spots" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux spots
      </Link>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-serif text-3xl">{nom || "Spot sans nom"}</h1>
          <p className="text-sm text-muted-foreground">{spot.data.adresse || "Adresse non renseignée"}</p>
          <p className="text-sm text-muted-foreground">
            Client :{" "}
            {spot.data.client ? (
              <Link to="/admin/clients/$id" params={{ id: spot.data.client.id }} className="text-primary hover:underline">{spot.data.client.nom}</Link>
            ) : "—"}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm">
          <span className="font-medium">{spot.data.statut === "actif" ? "Actif" : "Inactif"}</span>
          <button
            type="button" role="switch" aria-checked={spot.data.statut === "actif"} aria-label="Statut du spot"
            disabled={toggleStatut.isPending}
            onClick={() => toggleStatut.mutate(spot.data.statut !== "actif")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${spot.data.statut === "actif" ? "bg-primary" : "bg-input"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${spot.data.statut === "actif" ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Section 1 */}
          <section className={card}>
            <h2 className="font-serif text-xl">Infos spot</h2>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
              <div className="space-y-3">
                <label className="block space-y-1 text-sm">Nom du spot<input className={input} value={nom} onChange={(e) => setNom(e.target.value)} /></label>
                <label className="block space-y-1 text-sm">Lieu / adresse<input className={input} value={adresse} onChange={(e) => setAdresse(e.target.value)} /></label>
                <label className="block space-y-1 text-sm">Lien Short.io<input className={input} value={shortUrl} onChange={(e) => setShortUrl(e.target.value)} placeholder="https://…" /></label>
                <p className="text-xs text-muted-foreground">Ce lien redirige dynamiquement les visiteurs vers l'application.</p>
                <button onClick={() => saveSpot.mutate()} disabled={saveSpot.isPending}
                  className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm disabled:opacity-50">
                  {saveSpot.isPending ? "Sauvegarde…" : "Sauvegarder"}
                </button>
              </div>
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
                  // Une seule option par audio_id (les voix F/M sont dans audios_traductions ; le visiteur choisit sa voix dans la PWA)
                  const options = Array.from(
                    new Map(list.filter((a) => audioIdOf(a)).map((a) => [audioIdOf(a), a] as const)).entries(),
                  ).sort((x, y) => titreOf(x[1]).localeCompare(titreOf(y[1]), "fr"));
                  const current = list.find((a) => a.mis_en_avant && a.mis_en_avant_moment === c.key);
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className={`rounded-xl border p-4 space-y-2 ${now === c.key ? "border-primary bg-primary/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-primary" />{c.label}</span>
                        <span className="text-xs text-muted-foreground">{c.heures}{now === c.key && " · en cours"}</span>
                      </div>
                      <p className="text-sm">{current ? titreOf(current) : <span className="text-muted-foreground">Aucun audio programmé</span>}</p>
                      <select value="" disabled={options.length === 0 || setFeatured.isPending} className={input}
                        onChange={(e) => e.target.value && setFeatured.mutate({ moment: c.key, groupe: e.target.value })}>
                        <option value="">Changer d'audio…</option>
                        {options.map(([g, a]) => <option key={g} value={g}>{titreOf(a)}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
            {audios.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun audio lié à ce spot.</p>}
          </section>

          {/* Catalogue audio */}
          <section className={card}>
            <h2 className="font-serif text-xl">Catalogue audio</h2>
            <p className="text-sm text-muted-foreground">Brouillon = invisible pour tous. Le bouton masque un audio publié pour ce client uniquement.</p>
            {!clientId ? <p className="text-sm text-muted-foreground">Aucun client associé à ce spot.</p>
              : catalogue.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p>
              : (catalogue.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun audio assigné.</p>
              : (
                <ul className="divide-y">
                  {catalogue.data!.map((ca) => {
                    const brouillon = ca.audio?.statut !== "publié";
                    const on = !!ca.visible && !brouillon;
                    const titre = ca.audio?.audios_traductions?.find((t) => t.langue === "fr")?.titre ?? ca.audio?.titre_fr ?? "Sans titre";
                    return (
                      <li key={ca.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-medium">{titre}</p>
                          <p className="text-xs text-muted-foreground">{brouillon ? "Brouillon — invisible pour tous" : ca.visible ? "Visible" : "Masqué pour ce client"}</p>
                        </div>
                        <button type="button" role="switch" aria-checked={on} aria-label="Visibilité"
                          disabled={brouillon || toggleVisible.isPending}
                          onClick={() => toggleVisible.mutate({ caId: ca.id, visible: !ca.visible })}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-40 ${on ? "bg-primary" : "bg-input"}`}>
                          <span className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
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
          {/* Accès & QR Code */}
          <section className={card}>
            <h2 className="font-serif text-xl">Accès & QR Code</h2>
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm break-all font-mono">{pwaUrl.replace("https://", "")}</p>
            <button onClick={() => navigator.clipboard.writeText(pwaUrl).then(() => toast.success("Lien copié"))}
              className="flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm"><Copy className="h-4 w-4" />Copier le lien</button>
            {qrData && <img src={qrData} alt="QR code du spot" className="w-full max-w-[240px] mx-auto rounded-xl border" />}
            <button disabled={!qrData} onClick={downloadPng}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"><Download className="h-4 w-4" />Télécharger le QR code</button>
          </section>

          {/* Paramètres d'accès */}
          <section className={card}>
            <h2 className="font-serif text-xl">Paramètres d'accès</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Durée d'accès</dt><dd className="font-medium">{dureeJours != null ? `${dureeJours} jours` : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Début d'accès</dt><dd className="font-medium">{debut ? new Date(debut).toLocaleDateString("fr-FR") : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Fin d'accès (calculée)</dt><dd className="font-medium">{fin ? fin.toLocaleDateString("fr-FR") : "—"}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Durée commune à tous les spots de ce client · modifiable depuis la{" "}
              {spot.data.client ? <Link to="/admin/clients/$id" params={{ id: spot.data.client.id }} className="text-primary hover:underline">fiche client</Link> : "fiche client"}.
            </p>
          </section>

          {/* Note interne */}
          <section className={card}>
            <h2 className="font-serif text-xl">Note interne</h2>
            <textarea className={`${input} min-h-28`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Notes visibles uniquement par l'admin…" />
            <button onClick={() => saveNote.mutate()} disabled={saveNote.isPending}
              className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm disabled:opacity-50">
              {saveNote.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
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
