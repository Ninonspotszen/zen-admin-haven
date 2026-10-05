import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile || profile.role !== "admin") {
      throw redirect({ to: "/acces-refuse" });
    }
    return { user: data.user, profile };
  },
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/clients", label: "Clients B2B", exact: false },
  { to: "/admin/audios", label: "Audios", exact: false },
  { to: "/admin/abonnes", label: "Abonnés", exact: false },
  { to: "/admin/spots", label: "Spots", exact: false },
  { to: "/admin/configuration", label: "Configuration", exact: false },
] as const;

function AdminLayout() {
  const { profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-8">
          <div className="flex items-center gap-8">
            <span className="font-serif text-xl font-semibold text-primary">Spots Zen</span>
            <nav className="flex items-center gap-1.5">
              {TABS.map((tab) => {
                const active = tab.exact
                  ? pathname === tab.to
                  : pathname.startsWith(tab.to);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2.5 border-l pl-4">
            <button
              onClick={handleSignOut}
              title="Se déconnecter"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-accent text-xs font-semibold text-accent-foreground"
            >
              NG
            </button>
            <div>
              <p className="text-xs font-semibold leading-tight text-foreground">Ninon Godin</p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Admin · {profile.email ?? "bonjour@spotszen.fr"}
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
