import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function FeatureFlags() {
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/feature-flags").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const toggle = async (f) => {
    try { await api.put(`/admin/feature-flags/${f.key}`, null, { params: { enabled: !f.enabled } }); load(); }
    catch (e) { toast.error(errMessage(e)); }
  };
  return (
    <div data-testid="admin-flags-page">
      <PageHeader eyebrow="Platform" title="Feature flags" description="Flip modules on and off globally." />
      <div className="surface">
        <ul className="divide-y divide-border">
          {list.map((f) => (
            <li key={f.key} className="flex items-center gap-5 px-6 py-4" data-testid={`flag-row-${f.key}`}>
              <code className="font-mono text-[13px] w-56">{f.key}</code>
              <div className="flex-1 text-sm text-muted-foreground">{f.description}</div>
              <Switch checked={f.enabled} onCheckedChange={() => toggle(f)} data-testid={`flag-switch-${f.key}`} />
            </li>
          ))}
          {list.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No flags.</li>}
        </ul>
      </div>
    </div>
  );
}
