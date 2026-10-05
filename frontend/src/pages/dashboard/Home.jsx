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

  useEffect(() => {
    api.get("/tenants/summary").then((r) => setSum(r.data)).catch(() => {});
    api.get("/tenants/me").then((r) => setTenant(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      <PageHeader
        eyebrow="Workspace"
        title={`Good day, ${user?.name?.split(" ")[0] || "there"}.`}
        description={tenant ? `${tenant.name} · ${tenant.industry_slug || "set up your industry"}` : "Welcome to your AI Office."}
        actions={
          <Link to="/app/advisor">
            <Button className="btn-tenant" data-testid="home-advisor-btn"><Sparkles className="h-4 w-4 mr-2" />Ask the Advisor</Button>
          </Link>
        }
      />

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
    </div>
  );
}
