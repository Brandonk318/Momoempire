import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";

export default function Usage() {
  const [sum, setSum] = useState({});
  useEffect(() => { api.get("/tenants/summary").then((r) => setSum(r.data)).catch(() => {}); }, []);

  const metrics = [
    { label: "AI minutes used", value: 0, max: 500, note: "Starter plan allowance" },
    { label: "SMS sent", value: 0, max: 1000 },
    { label: "Appointments booked", value: sum.appointments || 0, max: 1000 },
    { label: "Knowledge entries", value: sum.knowledge_entries || 0, max: 100 },
  ];

  return (
    <div data-testid="usage-page">
      <PageHeader eyebrow="Setup" title="Usage" description="How much of your plan is in use." />
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((m) => {
          const pct = Math.min(100, Math.round((m.value / m.max) * 100));
          return (
            <div key={m.label} className="surface p-6">
              <div className="flex items-center justify-between">
                <div className="overline">{m.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{m.value} / {m.max}</div>
              </div>
              <Progress value={pct} className="mt-3 h-1.5" />
              {m.note && <div className="text-[11px] text-muted-foreground mt-2">{m.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
