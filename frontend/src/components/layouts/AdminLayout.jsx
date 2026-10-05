import { Link, NavLink } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Factory, Globe2, Flag, Activity, LogOut, Home } from "lucide-react";

const ITEMS = [
  { to: "/admin", end: true, icon: Home, label: "Overview", testId: "admin-nav-overview" },
  { to: "/admin/tenants", icon: Building2, label: "Tenants", testId: "admin-nav-tenants" },
  { to: "/admin/industries", icon: Factory, label: "Industries", testId: "admin-nav-industries" },
  { to: "/admin/countries", icon: Globe2, label: "Countries", testId: "admin-nav-countries" },
  { to: "/admin/feature-flags", icon: Flag, label: "Feature Flags", testId: "admin-nav-flags" },
  { to: "/admin/health", icon: Activity, label: "System Health", testId: "admin-nav-health" },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/admin"><Logo /></Link>
          <div className="mt-3 overline">Platform</div>
          <div className="font-display text-[15px] mt-1">Admin Console</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.testId}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    isActive ? "bg-foreground text-background" : "text-foreground/80 hover:bg-muted",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Link to="/app" className="block mb-2">
            <Button variant="outline" className="w-full" data-testid="back-to-app-btn">Back to App</Button>
          </Link>
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-foreground text-background text-[11px]">
                {(user?.name || "A").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out" data-testid="admin-logout-btn">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-8 max-w-[1400px]">{children}</main>
    </div>
  );
}
