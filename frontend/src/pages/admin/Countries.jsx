import { useEffect, useMemo, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS = {
  supported: "bg-emerald-100 text-emerald-900",
  preview: "bg-blue-100 text-blue-900",
  extended: "bg-violet-100 text-violet-900",
  unsupported: "bg-slate-200 text-slate-700",
  unavailable: "bg-amber-100 text-amber-900",
};
const STATUSES = ["supported", "preview", "extended", "unsupported", "unavailable"];

export default function AdminCountries() {
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", status: "supported", enabled: true, notes: "" });

  const load = () => {
    api.get("/countries").then((r) => setAll(r.data));
    api.get("/countries/summary").then((r) => setSummary(r.data));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => all.filter((c) => (filter === "all" || c.status === filter) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase()))), [all, filter, q]);

  const openEdit = (c) => { setEditing(c); setForm({ code: c.code, name: c.name, status: c.status, enabled: c.enabled, notes: c.notes || "" }); setOpen(true); };
  const openCreate = () => { setEditing(null); setForm({ code: "", name: "", status: "supported", enabled: true, notes: "" }); setOpen(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/countries/${editing.code}`, form);
      else await api.post("/countries", form);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const toggleEnabled = async (c) => {
    try { await api.put(`/countries/${c.code}`, { ...c, enabled: !c.enabled }); load(); }
    catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (code) => {
    if (!confirm(`Remove ${code}?`)) return;
    try { await api.delete(`/countries/${code}`); load(); } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="admin-countries-page">
      <PageHeader eyebrow="Platform" title="Country availability" description="Stripe-aware. Toggle live without a redeploy." actions={
        <Button className="btn-tenant" onClick={openCreate} data-testid="country-add-btn"><Plus className="h-4 w-4 mr-1" />Add country</Button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <button onClick={() => setFilter("all")} className={`surface p-4 text-left ${filter === "all" ? "ring-2 ring-foreground" : ""}`} data-testid="country-filter-all">
          <div className="overline">Total</div>
          <div className="font-display text-2xl mt-1">{summary.total ?? 0}</div>
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`surface p-4 text-left ${filter === s ? "ring-2 ring-foreground" : ""}`} data-testid={`country-filter-${s}`}>
            <div className="overline">{s}</div>
            <div className="font-display text-2xl mt-1">{summary[s] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Input className="max-w-xs" placeholder="Search country" value={q} onChange={(e) => setQ(e.target.value)} data-testid="country-search" />
        <span className="text-xs text-muted-foreground font-mono">{filtered.length} shown</span>
      </div>

      <div className="surface">
        <ul className="divide-y divide-border">
          {filtered.map((c) => (
            <li key={c.code} className="flex items-center gap-5 px-6 py-3" data-testid={`country-row-${c.code}`}>
              <code className="font-mono text-sm w-14">{c.code}</code>
              <div className="flex-1 min-w-0 truncate">{c.name}</div>
              <Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge>
              <Button variant={c.enabled ? "default" : "outline"} size="sm" onClick={() => toggleEnabled(c)} data-testid={`country-toggle-${c.code}`}>
                {c.enabled ? "Enabled" : "Disabled"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)} data-testid={`country-edit-${c.code}`}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del(c.code)} data-testid={`country-delete-${c.code}`}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="country-modal">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : "Add country"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!editing} data-testid="country-code-input" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="country-name-input" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} data-testid={`country-status-${s}`}
                    className={`px-3 py-1.5 rounded-lg text-[12px] border ${form.status === s ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{s}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enabled on signup</label>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!form.code || !form.name} data-testid="country-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
