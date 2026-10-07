import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Target, CalendarClock, Wrench, BookOpenText, ArrowRight, Sparkles } from "lucide-react";

const KPI = ({ label, value, icon: Icon, testId }) => (
  <div className="surface p-6 lift" data-testid={testId}>
    <div className="flex items-center justify-between">
      <div className="overline">{label}</div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="font-display text-4xl mt-2 tracking-tight">{value ?? "—"}</div>
  </div>
);

export default function Home() {
  const { user } = useAuth();
  const [sum, setSum] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [opps, setOpps] = useState([]);

  useEffect(() => {
    api.get("/tenants/summary").then((r) => setSum(r.data)).catch(() => {});
    api.get("/tenants/me").then((r) => {
      setTenant(r.data);
      if (r.data?.industry_slug) {
        api.get(`/industries/${r.data.industry_slug}`).then((industryRes) => setIndustry(industryRes.data)).catch(() => {});
      }
    }).catch(() => {});
    api.get("/tenants/pipeline/opportunities").then((r) => setOpps(r.data.items || [])).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      <PageHeader
        eyebrow="Workspace"
        title={`Good day, ${user?.name?.split(" ")[0] || "there"}.`}
        description={tenant ? `${tenant.name} · ${industry?.office_profile?.office_name || tenant.industry_slug || "set up your industry"}` : "Welcome to your AI Office."}
        actions={
          <Link to="/app/advisor">
            <Button className="btn-tenant" data-testid="home-advisor-btn"><Sparkles className="h-4 w-4 mr-2" />Ask the Advisor</Button>
          </Link>
        }
      />

      {industry?.office_profile && (
        <div className="mb-6 surface p-5" data-testid="home-niche-office">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="overline">Your niche Office</div>
              <div className="font-display text-2xl mt-1">{industry.office_profile.office_name}</div>
              <p className="text-sm text-muted-foreground mt-1">{industry.office_profile.tagline}</p>
            </div>
            <Badge variant="secondary">{industry.office_profile.cta}</Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI label="Leads" value={sum?.leads} icon={Target} testId="kpi-leads" />
        <KPI label="Customers" value={sum?.customers} icon={Users} testId="kpi-customers" />
        <KPI label="Upcoming jobs" value={sum?.upcoming_appointments} icon={CalendarClock} testId="kpi-upcoming" />
        <KPI label="Services" value={sum?.services} icon={Wrench} testId="kpi-services" />
        <KPI label="Knowledge" value={sum?.knowledge_entries} icon={BookOpenText} testId="kpi-knowledge" />
      </div>

      <div className="mt-10 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 surface p-8">
          <div className="overline mb-2">Your AI Employee</div>
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
            <div className="flex-1">
              <h3 className="font-display text-2xl">{tenant?.ai_employee?.name || "Alex"}</h3>
              <p className="text-sm text-muted-foreground mt-1">{tenant?.ai_employee?.personality || "Warm, professional, concise."}</p>
              <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
                "{tenant?.ai_employee?.greeting || "Hi! How can I help you today?"}"
              </div>
              <Link to="/app/ai-employee"><Button variant="outline" className="mt-5" data-testid="home-tune-ai-btn">Tune AI Employee <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 surface p-6">
          <div className="overline mb-2">Launch checklist</div>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { done: !!tenant?.onboarding_complete, t: "Complete onboarding", to: "/onboarding" },
              { done: (sum?.services || 0) > 0, t: "Add at least one service", to: "/app/services" },
              { done: (sum?.knowledge_entries || 0) >= 3, t: "Add 3 knowledge entries", to: "/app/knowledge" },
              { done: !!tenant?.contact_phone, t: "Add contact phone", to: "/app/settings" },
            ].map((it, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.t}</span>
                {!it.done && <Link to={it.to} className="text-[12px] font-medium underline underline-offset-4">Open</Link>}
                {it.done && <Badge variant="secondary">Done</Badge>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {opps.length > 0 && (
        <div className="mt-8 surface p-6" data-testid="home-opportunities">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline">Proactive opportunities</div>
              <div className="font-display text-xl mt-1">{opps.length} things to act on today</div>
            </div>
            <Link to="/app/analytics"><Button variant="outline" size="sm" data-testid="home-opp-all-btn">See all</Button></Link>
          </div>
          <ul className="divide-y divide-border">
            {opps.slice(0, 5).map((o, i) => (
              <li key={i} className="py-2.5 flex items-center gap-3" data-testid={`home-opp-${i}`}>
                <span className={`h-2 w-2 rounded-full ${o.severity === 'high' ? 'bg-rose-500' : o.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{o.detail}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{o.kind.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
