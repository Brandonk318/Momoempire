import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

const Stat = ({ label, value, sub, cls = "" }) => (
  <div className={`surface p-5 ${cls}`}>
    <div className="overline">{label}</div>
    <div className="font-display text-3xl mt-1 tracking-tight">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-1 font-mono">{sub}</div>}
  </div>
);

export default function PlatformAnalytics() {
  const [d, setD] = useState(null);
  const [margin, setMargin] = useState([]);
  useEffect(() => {
    api.get("/admin/analytics/overview").then((r) => setD(r.data));
    api.get("/admin/analytics/margin-by-plan").then((r) => setMargin(r.data));
  }, []);
  if (!d) return null;
  return (
    <div data-testid="platform-analytics-page">
      <PageHeader eyebrow="Platform" title="Analytics" description="MRR, churn, usage, gross margin by plan." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="MRR" value={`$${(d.mrr.cents / 100).toFixed(0)}`} sub={`ARPU $${(d.arpu_cents / 100).toFixed(2)}`} />
        <Stat label="Active" value={d.customers.active} sub={`${d.customers.trial} trials · ${d.customers.canceled_30d} churned 30d`} />
        <Stat label="Churn 30d" value={`${d.churn_30d_pct}%`} />
        <Stat label="Trial→Paid" value={`${d.conversion_pct}%`} sub="last 60 days" />
        <Stat label="Monthly cost" value={`$${(d.monthly_cost_cents / 100).toFixed(0)}`} />
        <Stat label="Gross margin" value={`${d.gross_margin_pct}%`} sub={`$${(d.gross_margin_cents / 100).toFixed(0)}`} cls={d.gross_margin_pct < 40 ? "border-rose-200 bg-rose-50/60" : ""} />
        <Stat label="AI revenue" value={`$${(d.ai_attributed_revenue_cents / 100).toFixed(0)}`} sub="from AI-sourced customers" />
        <Stat label="Totals" value={d.totals.calls} sub={`calls · ${d.totals.sms_threads} sms · ${d.totals.appointments} appts`} />
      </div>

      <div className="surface p-6 mb-6">
        <div className="overline mb-3">MRR by plan</div>
        <ul className="divide-y divide-border">
          {Object.entries(d.mrr.by_plan).map(([key, v]) => (
            <li key={key} className="flex items-center gap-4 py-2.5">
              <Badge variant="secondary">{key}</Badge>
              <div className="flex-1 text-sm">{v.count} tenants</div>
              <div className="font-mono text-sm">${(v.mrr_cents / 100).toFixed(0)}</div>
            </li>
          ))}
          {Object.keys(d.mrr.by_plan).length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No active subscriptions yet.</li>}
        </ul>
      </div>

      <div className="surface p-6">
        <div className="overline mb-3">Gross margin by plan</div>
        <ul className="divide-y divide-border">
          {margin.map((m) => (
            <li key={m.plan_key} className="flex items-center gap-4 py-2.5" data-testid={`margin-${m.plan_key}`}>
              <Badge variant="secondary">{m.plan_name}</Badge>
              <div className="flex-1 text-xs text-muted-foreground">{m.tenants} tenants</div>
              <div className="font-mono text-xs w-24 text-right">${(m.revenue_cents / 100).toFixed(0)} rev</div>
              <div className="font-mono text-xs w-24 text-right">${(m.cost_cents / 100).toFixed(0)} cost</div>
              <div className={`font-mono text-sm w-20 text-right ${m.margin_pct < 40 ? "text-rose-600" : "text-emerald-600"}`}>{m.margin_pct}%</div>
            </li>
          ))}
          {margin.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No data yet.</li>}
        </ul>
      </div>
    </div>
  );
}
