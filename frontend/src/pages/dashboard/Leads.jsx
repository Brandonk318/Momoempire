import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const COLORS = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-900",
  qualified: "bg-violet-100 text-violet-900",
  won: "bg-emerald-100 text-emerald-900",
  lost: "bg-slate-200 text-slate-700",
};

export default function Leads() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "manual", notes: "", status: "new" });

  const load = () => api.get("/tenants/leads").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/tenants/leads", { ...form, email: form.email || null });
      toast.success("Lead captured");
      setOpen(false); setForm({ name: "", email: "", phone: "", source: "manual", notes: "", status: "new" }); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const move = async (lead, status) => {
    try {
      await api.put(`/tenants/leads/${lead.id}`, { ...lead, status });
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="leads-page">
      <PageHeader eyebrow="Business" title="Leads" description="A kanban of your pipeline." actions={
        <Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="lead-add-btn"><Plus className="h-4 w-4 mr-1" />Capture lead</Button>
      } />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STATUSES.map((status) => (
          <div key={status} className="surface p-3" data-testid={`lead-col-${status}`}>
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="overline">{status}</span>
              <Badge variant="secondary">{list.filter((l) => l.status === status).length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {list.filter((l) => l.status === status).map((l) => (
                <div key={l.id} className="rounded-lg border border-border bg-background p-3" data-testid={`lead-card-${l.id}`}>
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.phone || l.email || l.source}</div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {STATUSES.filter((s) => s !== l.status).map((s) => (
                      <button key={s} onClick={() => move(l, s)} className={`text-[10px] px-2 py-0.5 rounded-full ${COLORS[s]} hover:opacity-80`} data-testid={`lead-move-${l.id}-${s}`}>→ {s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="lead-modal">
          <DialogHeader><DialogTitle>Capture a lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="lead-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="lead-email-input" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="lead-phone-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} data-testid="lead-source-input" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="lead-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={create} disabled={!form.name} data-testid="lead-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
