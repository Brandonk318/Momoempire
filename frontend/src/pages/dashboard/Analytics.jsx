import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingDown, TrendingUp, DollarSign, Flame, AlertTriangle, Target } from "lucide-react";

const SEVERITY = {
  high: "bg-rose-100 text-rose-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-slate-100 text-slate-700",
};

export default function Analytics() {
  const [funnel, setFunnel] = useState(null);
  const [attr, setAttr] = useState(null);
  const [opp, setOpp] = useState(null);
  const [hot, setHot] = useState([]);

  useEffect(() => {
    api.get("/tenants/pipeline/funnel").then((r) => setFunnel(r.data));
    api.get("/tenants/pipeline/attribution").then((r) => setAttr(r.data));
    api.get("/tenants/pipeline/opportunities").then((r) => setOpp(r.data));
    api.get("/tenants/pipeline/hot-leads").then((r) => setHot(r.data));
  }, []);

  const maxFunnel = Math.max(1, ...(funnel?.stages || []).map((s) => s.value));

  return (
    <div data-testid="analytics-page">
      <PageHeader eyebrow="Intelligence" title="Analytics" description="Funnel, revenue, and the opportunities you should act on today." />
      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel" data-testid="tab-funnel">Funnel</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="opportunities" data-testid="tab-opportunities">Opportunities ({opp?.count || 0})</TabsTrigger>
          <TabsTrigger value="hot" data-testid="tab-hot">Hot leads ({hot.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel">
          <div className="surface p-7">
            <div className="overline mb-4">Call → Lead → Appointment → Payment → Review · last {funnel?.days || 30} days</div>
            <ul className="space-y-3">
              {(funnel?.stages || []).map((s, i) => (
                <li key={s.key} className="flex items-center gap-4" data-testid={`funnel-stage-${s.key}`}>
                  <div className="w-36 text-sm">{s.label}</div>
                  <div className="flex-1 h-9 bg-muted rounded-lg relative overflow-hidden">
                    <div className="h-full bg-foreground text-background px-3 flex items-center text-xs font-mono" style={{ width: `${Math.max(5, (s.value / maxFunnel) * 100)}%` }}>
                      {s.value}
                    </div>
                  </div>
                  {i > 0 && <div className="w-20 text-right text-xs text-muted-foreground font-mono">{s.conversion ?? 0}%</div>}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          {attr && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="surface p-6"><div className="overline">Revenue (30d)</div><div className="font-display text-3xl mt-1">${attr.revenue.total}</div></div>
                <div className="surface p-6"><div className="overline">AI call revenue</div><div className="font-display text-3xl mt-1 flex items-center gap-1">${attr.revenue.ai_call}<TrendingUp className="h-4 w-4 text-emerald-500" /></div></div>
                <div className="surface p-6"><div className="overline">Avg deal</div><div className="font-display text-3xl mt-1">${attr.average_deal_value}</div></div>
                <div className="surface p-6 border-rose-100 bg-rose-50/60"><div className="overline">Missed revenue</div><div className="font-display text-3xl mt-1 flex items-center gap-1">${attr.estimated_missed_revenue}<TrendingDown className="h-4 w-4 text-rose-500" /></div><div className="text-[11px] text-muted-foreground mt-1">{attr.missed_calls} missed calls × avg deal</div></div>
              </div>

              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-7 surface p-6">
                  <div className="overline mb-3">Best services</div>
                  <ul className="divide-y divide-border">
                    {(attr.best_services || []).map((s) => (
                      <li key={s.name} className="flex items-center gap-4 py-2.5">
                        <div className="flex-1 truncate">{s.name}</div>
                        <div className="font-mono text-xs text-muted-foreground w-16 text-right">{s.count} bk</div>
                        <div className="font-mono text-sm w-24 text-right">${Number(s.revenue || 0).toFixed(0)}</div>
                      </li>
                    ))}
                    {(attr.best_services || []).length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No services booked yet.</li>}
                  </ul>
                </div>
                <div className="col-span-12 lg:col-span-5 surface p-6">
                  <div className="overline mb-3">Best sources</div>
                  <ul className="divide-y divide-border">
                    {(attr.best_sources || []).map((s) => (
                      <li key={s.source} className="flex items-center gap-4 py-2.5">
                        <Badge variant="secondary">{s.source}</Badge>
                        <div className="flex-1" />
                        <div className="font-mono text-sm">{s.count}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="opportunities">
          <div className="surface">
            {(opp?.items || []).length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">All caught up. Nice work.</div> : (
              <ul className="divide-y divide-border">
                {opp.items.map((o, i) => (
                  <li key={i} className="flex items-center gap-5 px-6 py-4" data-testid={`opp-row-${i}`}>
                    <AlertTriangle className={`h-4 w-4 ${o.severity === 'high' ? 'text-rose-600' : o.severity === 'medium' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.detail}</div>
                    </div>
                    <Badge className={SEVERITY[o.severity]}>{o.severity}</Badge>
                    <Badge variant="outline">{o.kind.replace(/_/g, " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hot">
          <div className="surface">
            <ul className="divide-y divide-border">
              {hot.map((l) => (
                <li key={l.id} className="flex items-center gap-5 px-6 py-4" data-testid={`hot-${l.id}`}>
                  <Flame className={`h-4 w-4 ${l.score > 80 ? 'text-rose-500' : l.score > 60 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone || l.email} · {l.source}</div>
                  </div>
                  <Badge className="font-mono">{l.score}</Badge>
                  <Badge variant="secondary">{l.status}</Badge>
                </li>
              ))}
              {hot.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No open leads right now.</li>}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
