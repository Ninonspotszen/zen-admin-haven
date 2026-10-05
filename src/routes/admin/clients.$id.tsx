import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client B2B — Spots Zen Admin" },
      { name: "description", content: "Détail d'un client B2B Spots Zen." },
      { property: "og:title", content: "Fiche client B2B — Spots Zen Admin" },
      { property: "og:description", content: "Détail d'un client B2B Spots Zen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <Link to="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux clients
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-bold text-foreground">
        {isLoading ? "Chargement…" : (data?.nom ?? "Client introuvable")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">La fiche détaillée arrive bientôt.</p>
    </div>
  );
}
