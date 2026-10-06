import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

export default function AdminAIQuality() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/quality/dashboard").then((r) => setRows(r.data)); }, []);
  return (
    <div data-testid="admin-quality-page">
      <PageHeader eyebrow="Platform" title="AI Quality" description="Tenants with the most flagged conversations." />
      <div className="surface">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.tenant_id} className="flex items-center gap-5 px-6 py-4" data-testid={`quality-row-${r.tenant_id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.tenant_name}</div>
                <div className="text-xs text-muted-foreground font-mono">{r.tenant_id}</div>
              </div>
              <Badge className="bg-slate-100">total {r.total}</Badge>
              <Badge className="bg-amber-100 text-amber-900">open {r.open}</Badge>
              <Badge className={r.high_severity ? "bg-rose-100 text-rose-900" : "bg-slate-100"}>high {r.high_severity}</Badge>
            </li>
          ))}
          {rows.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No quality flags across the platform. Nice.</li>}
        </ul>
      </div>
    </div>
  );
}
