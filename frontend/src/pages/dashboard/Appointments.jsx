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
import { Plus, Trash2 } from "lucide-react";

const STATUS_LABEL = {
  scheduled: "bg-blue-100 text-blue-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  completed: "bg-slate-200 text-slate-800",
  canceled: "bg-rose-100 text-rose-900",
  no_show: "bg-amber-100 text-amber-900",
};

export default function Appointments() {
  const [list, setList] = useState([]);
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", service_id: "", service_name: "", staff: "", start_at: defaultStart, end_at: "", status: "scheduled", notes: "" });

  const load = () => api.get("/tenants/appointments").then((r) => setList(r.data));
  useEffect(() => {
    load();
    api.get("/tenants/services").then((r) => setServices(r.data));
  }, []);

  const save = async () => {
    try {
      const payload = {
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : new Date(new Date(form.start_at).getTime() + 60 * 60 * 1000).toISOString(),
      };
      if (!payload.service_name && payload.service_id) {
        const svc = services.find((s) => s.id === payload.service_id);
        if (svc) payload.service_name = svc.name;
      }
      await api.post("/tenants/appointments", payload);
      toast.success("Appointment booked");
      setOpen(false); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (id) => {
    if (!confirm("Cancel this appointment?")) return;
    try { await api.delete(`/tenants/appointments/${id}`); load(); } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="appointments-page">
      <PageHeader eyebrow="Business" title="Appointments" description="Everything the AI books lands here." actions={
        <Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="appt-add-btn"><Plus className="h-4 w-4 mr-1" />Book appointment</Button>
      } />
      <div className="surface">
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground" data-testid="appt-empty">No appointments yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-6 px-6 py-4" data-testid={`appt-row-${a.id}`}>
                <div className="font-mono text-xs text-muted-foreground w-40">{new Date(a.start_at).toLocaleString()}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{a.service_name || "—"} · {a.staff || "unassigned"}</div>
                </div>
                <Badge className={STATUS_LABEL[a.status] || "bg-slate-100"}>{a.status}</Badge>
                <Button variant="ghost" size="icon" onClick={() => del(a.id)} data-testid={`appt-delete-${a.id}`}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="appt-modal">
          <DialogHeader><DialogTitle>Book an appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="appt-customer-input" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} data-testid="appt-phone-input" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} data-testid="appt-service-select">
                <option value="">—</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} data-testid="appt-start-input" /></div>
              <div className="space-y-1.5"><Label>End (optional)</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} data-testid="appt-end-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="appt-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!form.customer_name || !form.start_at} data-testid="appt-save-btn">Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
