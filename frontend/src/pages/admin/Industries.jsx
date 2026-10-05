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
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyIndustry = {
  slug: "", name: "", description: "", icon: "briefcase", ai_personality: "",
  knowledge_base: [], services: [], workflows: [], faqs: [], terminology: {},
  appointment_types: [], intake_questions: [], escalation_rules: [], emergency_rules: [],
  recommended_integrations: [], recommended_website_content: [], industry_automations: [],
  active: true,
};

export default function AdminIndustries() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyIndustry);
  const [arrText, setArrText] = useState({ appointment_types: "", intake_questions: "", escalation_rules: "", emergency_rules: "", recommended_integrations: "" });

  const load = () => api.get("/industries").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyIndustry); setArrText({ appointment_types: "", intake_questions: "", escalation_rules: "", emergency_rules: "", recommended_integrations: "" }); setOpen(true); };
  const openEdit = (ind) => {
    setEditing(ind);
    setForm(ind);
    setArrText({
      appointment_types: (ind.appointment_types || []).join(", "),
      intake_questions: (ind.intake_questions || []).join("\n"),
      escalation_rules: (ind.escalation_rules || []).join("\n"),
      emergency_rules: (ind.emergency_rules || []).join("\n"),
      recommended_integrations: (ind.recommended_integrations || []).join(", "),
    });
    setOpen(true);
  };
  const save = async () => {
    const payload = {
      ...form,
      appointment_types: arrText.appointment_types.split(",").map((x) => x.trim()).filter(Boolean),
      intake_questions: arrText.intake_questions.split("\n").map((x) => x.trim()).filter(Boolean),
      escalation_rules: arrText.escalation_rules.split("\n").map((x) => x.trim()).filter(Boolean),
      emergency_rules: arrText.emergency_rules.split("\n").map((x) => x.trim()).filter(Boolean),
      recommended_integrations: arrText.recommended_integrations.split(",").map((x) => x.trim()).filter(Boolean),
    };
    try {
      if (editing) await api.put(`/industries/${editing.slug}`, payload);
      else await api.post("/industries", payload);
      toast.success("Saved");
      setOpen(false); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (slug) => {
    if (!confirm(`Delete industry ${slug}?`)) return;
    try { await api.delete(`/industries/${slug}`); load(); } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="admin-industries-page">
      <PageHeader eyebrow="Platform" title="Industry Templates" description="The reusable DNA for every tenant's AI Office." actions={
        <Button className="btn-tenant" onClick={openCreate} data-testid="industry-add-btn"><Plus className="h-4 w-4 mr-1" />New template</Button>
      } />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((ind) => (
          <div key={ind.slug} className="surface p-6 lift" data-testid={`industry-card-${ind.slug}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-xl">{ind.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{ind.slug}</div>
              </div>
              <Badge variant={ind.active ? "default" : "secondary"}>{ind.active ? "active" : "inactive"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{ind.description || "No description"}</p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(ind)} data-testid={`industry-edit-${ind.slug}`}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => del(ind.slug)} data-testid={`industry-delete-${ind.slug}`}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="industry-modal">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : "New industry template"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} data-testid="industry-slug-input" /></div>
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="industry-name-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>AI personality</Label><Textarea rows={2} value={form.ai_personality} onChange={(e) => setForm({ ...form, ai_personality: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Appointment types (comma)</Label><Input value={arrText.appointment_types} onChange={(e) => setArrText({ ...arrText, appointment_types: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Intake questions (one per line)</Label><Textarea rows={3} value={arrText.intake_questions} onChange={(e) => setArrText({ ...arrText, intake_questions: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Escalation rules (one per line)</Label><Textarea rows={3} value={arrText.escalation_rules} onChange={(e) => setArrText({ ...arrText, escalation_rules: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Emergency rules (one per line)</Label><Textarea rows={3} value={arrText.emergency_rules} onChange={(e) => setArrText({ ...arrText, emergency_rules: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Recommended integrations (comma)</Label><Input value={arrText.recommended_integrations} onChange={(e) => setArrText({ ...arrText, recommended_integrations: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!form.slug || !form.name} data-testid="industry-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
