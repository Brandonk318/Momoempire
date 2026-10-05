import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function Services() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", duration_minutes: 60, price: 0, active: true });

  const load = () => api.get("/tenants/services").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", duration_minutes: 60, price: 0, active: true }); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setOpen(true); };
  const save = async () => {
    try {
      if (editing) {
        await api.put(`/tenants/services/${editing.id}`, form);
        toast.success("Service updated");
      } else {
        await api.post("/tenants/services", form);
        toast.success("Service added");
      }
      setOpen(false); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (id) => {
    if (!confirm("Delete this service?")) return;
    try { await api.delete(`/tenants/services/${id}`); load(); toast.success("Deleted"); }
    catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="services-page">
      <PageHeader eyebrow="Business" title="Services" description="What customers can book, buy, and ask about." actions={
        <Button className="btn-tenant" onClick={openCreate} data-testid="service-add-btn"><Plus className="h-4 w-4 mr-1" />Add service</Button>
      } />
      <div className="surface">
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground" data-testid="services-empty">No services yet. Add one to let your AI Employee quote and book.</div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((s) => (
              <li key={s.id} className="flex items-center gap-6 px-6 py-4" data-testid={`service-row-${s.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{s.description || "No description"}</div>
                </div>
                <div className="font-mono text-sm w-20 text-right">{s.duration_minutes}m</div>
                <div className="font-mono text-sm w-24 text-right">${Number(s.price || 0).toFixed(0)}</div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`service-edit-${s.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(s.id)} data-testid={`service-delete-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="service-modal">
          <DialogHeader><DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="service-name-input" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="service-desc-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Duration (minutes)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} data-testid="service-duration-input" /></div>
              <div className="space-y-1.5"><Label>Price (USD)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} data-testid="service-price-input" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!form.name} data-testid="service-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
