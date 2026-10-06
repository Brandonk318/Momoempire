import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

const TIER_COLORS = {
  0.7: "bg-amber-100 text-amber-900",
  0.85: "bg-amber-200 text-amber-900",
  0.9: "bg-orange-200 text-orange-900",
  0.95: "bg-rose-200 text-rose-900",
  1.0: "bg-rose-500 text-white",
};

const TIER_MSG = {
  0.7: "You're at 70% — plenty of runway, but worth a glance.",
  0.85: "At 85% — consider upgrading before the month closes.",
  0.9: "At 90% — upgrade now to avoid service interruption.",
  0.95: "At 95% — upgrade immediately.",
  1.0: "Limit reached. The AI gracefully offers to take messages instead of disconnecting callers.",
};

export default function Usage() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/usage/me").then((r) => setData(r.data)); }, []);
  if (!data) return null;

  const anyWarning = data.metrics.find((m) => m.warning_tier != null);

  return (
    <div data-testid="usage-page">
      <PageHeader
        eyebrow="Setup"
        title="Usage"
        description={`${data.plan.toUpperCase()} plan · period ${data.period}`}
        actions={<Link to="/app/billing"><Button className="btn-tenant" data-testid="usage-upgrade-btn"><TrendingUp className="h-4 w-4 mr-1" />Upgrade</Button></Link>}
      />

      {anyWarning && (
        <div className="surface p-5 mb-6 border-amber-200 bg-amber-50 text-amber-900" data-testid="usage-warning-banner">
          <div className="font-medium">You're approaching a limit</div>
          <div className="text-sm">{TIER_MSG[anyWarning.warning_tier]}</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.metrics.map((m) => (
          <div key={m.metric} className="surface p-6" data-testid={`usage-metric-${m.metric}`}>
            <div className="flex items-center justify-between">
              <div className="overline">{m.metric.replace(/_/g, " ")}</div>
              <div className="font-mono text-xs text-muted-foreground">{m.used} / {m.limit}</div>
            </div>
            <Progress value={Math.min(100, m.pct)} className="mt-3 h-1.5" />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.pct}% used</span>
              {m.warning_tier != null && <Badge className={TIER_COLORS[m.warning_tier]}>{Math.round(m.warning_tier * 100)}%</Badge>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 surface p-6">
        <div className="overline mb-2">Graceful fallback</div>
        <p className="text-sm text-muted-foreground">When limits are reached the AI never disconnects. It politely offers to take a message, voicemail, or trigger a callback via your emergency procedure.</p>
      </div>
    </div>
  );
}
