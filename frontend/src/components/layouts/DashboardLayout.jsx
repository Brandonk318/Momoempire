import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import {
  Home, Bot, PhoneCall, MessageSquare, Target, Users, CalendarClock,
  Wrench, CreditCard, Globe, UserRound, Star, LineChart, Compass,
  BookOpenText, Workflow, Plug, PhoneForwarded, Gauge, Receipt, Settings,
  LogOut, ShieldCheck, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/app", icon: Home, label: "Home", end: true, testId: "nav-home" },
      { to: "/app/ai-employee", icon: Bot, label: "AI Employee", testId: "nav-ai-employee" },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/app/calls", icon: PhoneCall, label: "Calls", testId: "nav-calls" },
      { to: "/app/messages", icon: MessageSquare, label: "Messages", testId: "nav-messages" },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/app/leads", icon: Target, label: "Leads", testId: "nav-leads" },
      { to: "/app/customers", icon: Users, label: "Customers", testId: "nav-customers" },
      { to: "/app/appointments", icon: CalendarClock, label: "Appointments", testId: "nav-appointments" },
      { to: "/app/services", icon: Wrench, label: "Services", testId: "nav-services" },
      { to: "/app/payments", icon: CreditCard, label: "Payments", testId: "nav-payments" },
      { to: "/app/website", icon: Globe, label: "Website", testId: "nav-website" },
      { to: "/app/customer-portal", icon: UserRound, label: "Customer Portal", testId: "nav-customer-portal" },
      { to: "/app/reviews", icon: Star, label: "Reviews", testId: "nav-reviews" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/app/analytics", icon: LineChart, label: "Analytics", testId: "nav-analytics" },
      { to: "/app/advisor", icon: Compass, label: "Business Advisor", testId: "nav-advisor" },
      { to: "/app/sales-intel", icon: Target, label: "Sales Intel", testId: "nav-sales-intel" },
      { to: "/app/growth", icon: Rocket, label: "Growth", testId: "nav-growth" },
      { to: "/app/knowledge", icon: BookOpenText, label: "Knowledge Base", testId: "nav-knowledge" },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/app/automations", icon: Workflow, label: "Automations", testId: "nav-automations" },
      { to: "/app/integrations", icon: Plug, label: "Integrations", testId: "nav-integrations" },
      { to: "/app/phone-numbers", icon: PhoneForwarded, label: "Phone Numbers", testId: "nav-phone-numbers" },
      { to: "/app/usage", icon: Gauge, label: "Usage", testId: "nav-usage" },
      { to: "/app/billing", icon: Receipt, label: "Billing", testId: "nav-billing" },
      { to: "/app/settings", icon: Settings, label: "Settings", testId: "nav-settings" },
    ],
  },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (!user?.tenant_id) return;
    api.get("/tenants/me").then((r) => setTenant(r.data)).catch(() => {});
  }, [user?.tenant_id, location.pathname]);

  // Apply tenant branding tokens to CSS vars
  useEffect(() => {
    if (!tenant?.branding) return;
    const b = tenant.branding;
    if (b.primary_color) document.documentElement.style.setProperty("--tenant-primary", b.primary_color);
    if (b.accent_color) document.documentElement.style.setProperty("--tenant-accent", b.accent_color);
  }, [tenant?.branding?.primary_color, tenant?.branding?.accent_color]);

  const needsOnboarding = user?.tenant_id && tenant && !tenant.onboarding_complete;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-[260px] shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen" data-testid="dashboard-sidebar">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/app"><Logo /></Link>
          <div className="mt-3 text-[11px] overline">Workspace</div>
          <div className="font-display text-[15px] leading-tight mt-1 truncate" title={tenant?.name}>
            {tenant?.name || "Your business"}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="px-2 overline mb-2">{g.label}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <NavLink
                        to={it.to}
                        end={it.end}
                        data-testid={it.testId}
                        className={({ isActive }) =>
                          [
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px]",
                            "transition-colors",
                            isActive
                              ? "bg-foreground text-background"
                              : "text-foreground/80 hover:bg-muted",
                          ].join(" ")
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          {user?.role === "platform_admin" && (
            <Link to="/admin" className="block mb-2">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="go-admin-btn">
                <ShieldCheck className="h-4 w-4" /> Platform Admin
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              {user?.picture && <img src={user.picture} alt="" className="h-full w-full object-cover" />}
              <AvatarFallback className="bg-foreground text-background text-[11px]">
                {(user?.name || user?.email || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} data-testid="logout-btn" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {needsOnboarding && (
          <div className="border-b border-amber-200/70 bg-amber-50 text-amber-900 px-6 py-2 text-[13px] flex items-center justify-between">
            <span data-testid="onboarding-banner">Finish setting up your AI Office to unlock the full dashboard.</span>
            <Link to="/onboarding" className="font-medium underline underline-offset-4" data-testid="resume-onboarding-link">Resume setup</Link>
          </div>
        )}
        <div className="px-8 py-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
