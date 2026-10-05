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
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="text-lg font-semibold text-foreground">Spots Zen</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Ninon Godin</p>
              <p className="text-xs text-muted-foreground">
                Admin · {profile.email ?? "bonjour@spotszen.fr"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Se déconnecter"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              NG
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.to
              : pathname.startsWith(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
