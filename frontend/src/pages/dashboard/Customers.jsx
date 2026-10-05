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

export default function Customers() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", tags: [] });

  const load = () => api.get("/tenants/customers").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/tenants/customers", { ...form, email: form.email || null });
      toast.success("Customer added");
      setOpen(false); setForm({ name: "", email: "", phone: "", notes: "", tags: [] }); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (id) => {
    if (!confirm("Delete this customer?")) return;
    try { await api.delete(`/tenants/customers/${id}`); load(); }
    catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="customers-page">
      <PageHeader eyebrow="Business" title="Customers" description="A single ledger for everyone you serve." actions={
        <Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="customer-add-btn"><Plus className="h-4 w-4 mr-1" />Add customer</Button>
      } />
      <div className="surface">
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground" data-testid="customers-empty">No customers yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-6 px-6 py-4" data-testid={`customer-row-${c.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email || "—"} · {c.phone || "—"}</div>
                </div>
                <div className="flex gap-1.5">
                  {(c.tags || []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del(c.id)} data-testid={`customer-delete-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="customer-modal">
          <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="customer-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="customer-email-input" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="customer-phone-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="customer-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={create} disabled={!form.name} data-testid="customer-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
