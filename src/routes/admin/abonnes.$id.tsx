import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatutBadge, STATUTS } from "./abonnes.index";

export const Route = createFileRoute("/admin/abonnes/$id")({
  head: () => ({
    meta: [
      { title: "Fiche abonné — Spots Zen Admin" },
      { name: "description", content: "Détail et édition d'un abonné B2C Spots Zen." },
      { property: "og:title", content: "Fiche abonné — Spots Zen Admin" },
      { property: "og:description", content: "Détail et édition d'un abonné B2C Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbonneDetail,
});

function AbonneDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["abonne", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abonnes_b2c")
        .select("*, parrain:parrain_id(email)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [f, setF] = useState({ statut: "actif", formule: "", dateFin: "", note: "" });

  useEffect(() => {
    if (!data) return;
    setF({
      statut: data.statut ?? "actif",
      formule: data.formule ?? "",
      dateFin: data.date_fin_acces ?? "",
      note: data.note_interne ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("abonnes_b2c")
        .update({
          statut: f.statut,
          formule: f.formule || null,
          date_fin_acces: f.dateFin || null,
          note_interne: f.note || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modifications enregistrées");
      qc.invalidateQueries({ queryKey: ["abonne", id] });
      qc.invalidateQueries({ queryKey: ["abonnes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
  const label = "mb-1 block text-xs font-semibold text-muted-foreground";

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Chargement…</p>;
  if (error || !data) return <p className="py-10 text-center text-destructive">Erreur : {(error as Error)?.message ?? "Abonné introuvable"}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/abonnes" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux abonnés
      </Link>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">{data.email}</h1>
        <StatutBadge statut={data.statut} />
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <div>
          <span className={label}>Prénom</span>
          <p className="text-sm text-foreground">{data.prenom ?? "—"}</p>
        </div>
        <div>
          <span className={label}>Langue préférée</span>
          <p className="text-sm uppercase text-foreground">{data.langue_preferee ?? "fr"}</p>
        </div>
        <div>
          <span className={label}>Stripe customer ID</span>
          <p className="break-all text-sm text-foreground">{data.stripe_customer_id ?? "—"}</p>
        </div>
        <div>
          <span className={label}>Code parrainage</span>
          <p className="text-sm text-foreground">{data.code_parrainage ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Parrain</span>
          <p className="text-sm text-foreground">
            {(data.parrain as { email: string } | null)?.email ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <div>
          <label className={label}>Statut</label>
          <select className={input} value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Formule</label>
          <input className={input} value={f.formule} onChange={(e) => setF({ ...f, formule: e.target.value })} />
        </div>
        <div>
          <label className={label}>Date de fin d'accès</label>
          <input type="date" className={input} value={f.dateFin} onChange={(e) => setF({ ...f, dateFin: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Note interne</label>
          <textarea
            className={`${input} min-h-28 resize-y`}
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder="Note visible uniquement par l'admin…"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {save.isPending ? "Enregistrement…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}
