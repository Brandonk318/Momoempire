import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState({});
  useEffect(() => {
    api.get("/admin/health").then((r) => setHealth(r.data));
    api.get("/admin/overview").then((r) => setOverview(r.data));
  }, []);

  return (
    <div data-testid="admin-health-page">
      <PageHeader eyebrow="Platform" title="System health" description="A quick glance at the plumbing." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="surface p-6">
          <div className="overline mb-2">API</div>
          <div className="flex items-center gap-3">
            <Badge className={health?.status === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"} data-testid="health-api-badge">
              {health?.status || "unknown"}
            </Badge>
            <span className="text-sm text-muted-foreground">Latency and queue depth land here in Phase 2.</span>
          </div>
        </div>
        <div className="surface p-6">
          <div className="overline mb-2">MongoDB</div>
          <Badge className={health?.db === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"} data-testid="health-db-badge">
            {health?.db || "unknown"}
          </Badge>
        </div>
        <div className="surface p-6 md:col-span-2">
          <div className="overline mb-2">Platform scale</div>
          <pre className="font-mono text-xs bg-muted p-4 rounded-lg overflow-x-auto">{JSON.stringify(overview, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
