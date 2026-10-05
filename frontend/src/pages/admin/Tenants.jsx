import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminTenants() {
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/tenants").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const toggle = async (t) => {
    const status = t.status === "active" ? "suspended" : "active";
    try { await api.put(`/admin/tenants/${t.id}/status`, null, { params: { status } }); load(); }
    catch (e) { toast.error(errMessage(e)); }
  };
  return (
    <div data-testid="admin-tenants-page">
      <PageHeader eyebrow="Platform" title="Tenants" description="Every business running on the platform." />
      <div className="surface">
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-6 px-6 py-4" data-testid={`admin-tenant-${t.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">{t.slug} · {t.industry_slug || "no industry"}</div>
              </div>
              <Badge variant={t.onboarding_complete ? "default" : "secondary"}>{t.onboarding_complete ? "onboarded" : "pending"}</Badge>
              <Badge variant={t.status === "active" ? "default" : "destructive"}>{t.status}</Badge>
              <div className="font-mono text-xs text-muted-foreground w-40 text-right truncate">{new Date(t.created_at).toLocaleDateString()}</div>
              <Button variant="outline" onClick={() => toggle(t)} data-testid={`admin-tenant-toggle-${t.id}`}>{t.status === "active" ? "Suspend" : "Reactivate"}</Button>
            </li>
          ))}
          {list.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No tenants yet.</li>}
        </ul>
      </div>
    </div>
  );
}
