import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PlayCircle } from "lucide-react";
import { toast } from "sonner";

const Stat = ({ label, value }) => (
  <div className="surface p-6">
    <div className="overline">{label}</div>
    <div className="font-display text-4xl mt-2 tracking-tight">{value ?? "—"}</div>
  </div>
);

export default function AdminOverview() {
  const [s, setS] = useState({});
  const [overage, setOverage] = useState([]);
  const [running, setRunning] = useState(false);

  const loadOverage = () => api.get("/admin/overage/preview").then((r) => setOverage(r.data)).catch(() => {});

  useEffect(() => {
    api.get("/admin/overview").then((r) => setS(r.data));
    loadOverage();
  }, []);

  const downloadSource = async () => {
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || "") + "/api/admin/source/zip";
      // Use fetch to keep auth cookies / download via blob
      const res = await fetch(base, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-office-platform.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Source downloaded");
    } catch (e) { toast.error(e.message || "Download failed"); }
  };

  const runOverage = async (dry = false) => {
    setRunning(true);
    try {
      const { data } = await api.post("/admin/overage/run", null, { params: { dry_run: dry, charge: !dry } });
      toast.success(`${dry ? "Preview" : "Charged"} ${data.results.length} tenants`);
      loadOverage();
    } catch (e) { toast.error(errMessage(e)); }
    finally { setRunning(false); }
  };

  return (
    <div data-testid="admin-overview-page">
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        description="Health and scale of the AI Office platform."
        actions={
          <Button variant="outline" onClick={downloadSource} data-testid="download-source-btn">
            <Download className="h-4 w-4 mr-2" /> Download source zip
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Tenants" value={s.tenants} />
        <Stat label="Active" value={s.active_tenants} />
        <Stat label="Onboarded" value={s.onboarded} />
        <Stat label="Users" value={s.users} />
        <Stat label="Industries" value={s.industries} />
        <Stat label="Countries enabled" value={s.countries_enabled} />
        <Stat label="Flags" value={s.feature_flags} />
        <Stat label="Appointments total" value={s.appointments_total} />
      </div>

      <div className="surface mt-8 p-6" data-testid="overage-preview">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="overline">Overage this period</div>
            <div className="font-display text-2xl mt-1">
              ${overage.reduce((a, b) => a + (b.total_cents || 0), 0) / 100 | 0}.{(overage.reduce((a, b) => a + (b.total_cents || 0), 0) % 100).toString().padStart(2, "0")}
              <span className="text-sm text-muted-foreground font-sans"> across {overage.length} tenants</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runOverage(true)} disabled={running} data-testid="overage-preview-btn">Preview</Button>
            <Button className="btn-tenant" onClick={() => runOverage(false)} disabled={running || overage.length === 0} data-testid="overage-charge-btn"><PlayCircle className="h-4 w-4 mr-1" />Record & charge</Button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {overage.map((o) => (
            <li key={o.tenant_id} className="py-2.5 flex items-center gap-3" data-testid={`overage-row-${o.tenant_id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{o.tenant_name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{o.plan} · {o.period}</div>
              </div>
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                {o.items.map((it) => (
                  <Badge key={it.metric} variant="secondary" className="font-mono text-[11px]">{it.metric}: +{Math.round(it.overage_units)}</Badge>
                ))}
              </div>
              <div className="font-mono text-sm w-24 text-right">${(o.total_cents / 100).toFixed(2)}</div>
            </li>
          ))}
          {overage.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No tenant is over quota this period.</li>}
        </ul>
      </div>
    </div>
  );
}
