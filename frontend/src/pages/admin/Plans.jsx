import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

const METRICS = ["ai_minutes", "calls", "sms", "ai_interactions", "locations", "users", "phone_numbers", "personas", "integrations"];

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [costs, setCosts] = useState({ costs: {} });
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const [costOpen, setCostOpen] = useState(false);

  const load = () => {
    api.get("/admin/plans").then((r) => setPlans(r.data));
    api.get("/admin/plans/costs/current").then((r) => setCosts(r.data));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p) => { setOpen(p); setForm({ ...p, limits: { ...p.limits }, overage: { ...p.overage } }); };
  const save = async () => {
    try {
      await api.put(`/admin/plans/${open.key}`, {
        key: form.key, name: form.name, price_cents: Number(form.price_cents),
        interval: form.interval, trial_days: Number(form.trial_days || 0),
        sort_order: Number(form.sort_order || 100), is_public: !!form.is_public,
        description: form.description || "", features: form.features || [],
        stripe_price_id: (form.stripe_price_id || "").trim(),
        limits: Object.fromEntries(Object.entries(form.limits).map(([k, v]) => [k, Number(v) || 0])),
        overage: Object.fromEntries(Object.entries(form.overage).map(([k, v]) => [k, Number(v) || 0])),
      });
      toast.success("Plan updated"); setOpen(null); load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  const saveCosts = async () => {
    try {
      await api.put("/admin/plans/costs/current", { costs: Object.fromEntries(Object.entries(costs.costs).map(([k, v]) => [k, Number(v) || 0])) });
      toast.success("Costs updated"); setCostOpen(false); load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="admin-plans-page">
      <PageHeader eyebrow="Platform" title="Plans & pricing" description="Configurable bookmarks. Nothing is permanent." actions={
        <Button variant="outline" onClick={() => setCostOpen(true)} data-testid="costs-btn">Unit costs</Button>
      } />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.key} className="surface p-6 lift" data-testid={`plan-card-${p.key}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="overline">{p.key}</div>
                <div className="font-display text-xl mt-1">{p.name}</div>
              </div>
              <Badge variant={p.is_public ? "default" : "secondary"}>{p.is_public ? "public" : "hidden"}</Badge>
            </div>
            <div className="font-display text-3xl mt-3">{p.price_cents > 0 ? `$${(p.price_cents / 100).toFixed(2)}` : (p.interval === "custom" ? "Custom" : "Free")}<span className="text-sm text-muted-foreground font-sans"> /{p.interval}</span></div>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
              {Object.entries(p.limits || {}).map(([k, v]) => <div key={k}>· {k.replace(/_/g, " ")}: {v}</div>)}
            </div>
            {p.stripe_price_id && <div className="mt-2 text-[11px] font-mono text-emerald-700 truncate" title={p.stripe_price_id}>✓ stripe: {p.stripe_price_id}</div>}
            <Button className="mt-5" variant="outline" onClick={() => openEdit(p)} data-testid={`plan-edit-${p.key}`}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
          </div>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="plan-modal">
          <DialogHeader><DialogTitle>Edit {open?.name}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="plan-name" /></div>
                <div className="space-y-1.5"><Label>Price (cents)</Label><Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} data-testid="plan-price" /></div>
                <div className="space-y-1.5"><Label>Trial days</Label><Input type="number" value={form.trial_days || 0} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={form.sort_order || 100} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Stripe Price ID <span className="text-[11px] text-muted-foreground">(price_XXXX — leave empty to use ad-hoc price)</span></Label>
                <Input value={form.stripe_price_id || ""} placeholder="price_1AbcdefGhijkl" onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} data-testid={`plan-stripe-price-${open?.key}`} />
              </div>
              <div>
                <Label>Limits</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {METRICS.map((m) => (
                    <div key={m} className="space-y-1">
                      <div className="text-[11px] text-muted-foreground font-mono">{m}</div>
                      <Input type="number" value={form.limits?.[m] ?? 0} onChange={(e) => setForm({ ...form, limits: { ...form.limits, [m]: e.target.value } })} data-testid={`plan-limit-${m}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Overage (cents per unit)</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["ai_minutes", "calls", "sms"].map((m) => (
                    <div key={m} className="space-y-1">
                      <div className="text-[11px] text-muted-foreground font-mono">{m}</div>
                      <Input type="number" step="0.1" value={form.overage?.[m] ?? 0} onChange={(e) => setForm({ ...form, overage: { ...form.overage, [m]: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Public (shown on pricing page)</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} data-testid="plan-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent data-testid="costs-modal">
          <DialogHeader><DialogTitle>Unit costs (cents per unit)</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Powers gross-margin math in platform analytics.</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {["ai_minutes", "calls", "sms", "storage_gb", "payment_processing_bps"].map((k) => (
              <div key={k} className="space-y-1">
                <div className="text-[11px] font-mono">{k}</div>
                <Input type="number" step="0.1" value={costs.costs?.[k] ?? 0} onChange={(e) => setCosts({ ...costs, costs: { ...costs.costs, [k]: e.target.value } })} data-testid={`cost-${k}`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCostOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={saveCosts} data-testid="costs-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
