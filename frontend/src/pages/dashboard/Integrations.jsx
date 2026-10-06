import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plug, Trash2 } from "lucide-react";

export default function Integrations() {
  const [catalog, setCatalog] = useState([]);
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState(null);
  const [cfg, setCfg] = useState({});

  const load = () => {
    api.get("/tenants/integrations/catalog").then((r) => setCatalog(r.data));
    api.get("/tenants/integrations").then((r) => setMine(r.data));
  };
  useEffect(() => { load(); }, []);

  const openConfig = (item) => {
    const current = mine.find((m) => m.key === item.key);
    setOpen(item);
    setCfg(current?.config || {});
  };

  const save = async () => {
    try { await api.post("/tenants/integrations", { key: open.key, enabled: true, config: cfg }); toast.success("Saved"); setOpen(null); load(); }
    catch (e) { toast.error(errMessage(e)); }
  };

  const disconnect = async (key) => {
    if (!confirm("Disconnect?")) return;
    try { await api.delete(`/tenants/integrations/${key}`); load(); } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="integrations-page">
      <PageHeader eyebrow="Setup" title="Integrations" description="Plug your office into the tools you already use." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map((item) => {
          const current = mine.find((m) => m.key === item.key);
          const status = current?.status || "disconnected";
          return (
            <div key={item.key} className="surface p-6 lift" data-testid={`integration-card-${item.key}`}>
              <div className="flex items-center justify-between">
                <div className="font-display text-xl">{item.label}</div>
                <Badge className={status === "connected" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}>{status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2 font-mono">{item.key}</div>
              <div className="mt-5 flex gap-2">
                <Button variant="outline" onClick={() => openConfig(item)} data-testid={`integration-config-${item.key}`}><Plug className="h-3 w-3 mr-1" />Configure</Button>
                {current && <Button variant="ghost" onClick={() => disconnect(item.key)} data-testid={`integration-disconnect-${item.key}`}><Trash2 className="h-3 w-3" /></Button>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent data-testid="integration-modal">
          <DialogHeader><DialogTitle>Configure {open?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(open?.needs || []).map((need) => (
              <div key={need} className="space-y-1.5">
                <Label className="capitalize">{need.replace(/_/g, " ")}</Label>
                <Input type={need.includes("token") || need.includes("secret") ? "password" : "text"} value={cfg[need] || ""} onChange={(e) => setCfg({ ...cfg, [need]: e.target.value })} data-testid={`integration-field-${need}`} />
              </div>
            ))}
            {(open?.needs || []).length === 0 && <p className="text-sm text-muted-foreground">No configuration needed — already managed.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} data-testid="integration-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
