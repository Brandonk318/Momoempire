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

export default function KnowledgeBase() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", tags: [] });
  const [tagsText, setTagsText] = useState("");

  const load = () => api.get("/tenants/knowledge").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/tenants/knowledge", { ...form, tags: tagsText.split(",").map((x) => x.trim()).filter(Boolean) });
      toast.success("Entry added");
      setOpen(false); setForm({ question: "", answer: "", tags: [] }); setTagsText("");
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const del = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try { await api.delete(`/tenants/knowledge/${id}`); load(); } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="knowledge-page">
      <PageHeader eyebrow="Intelligence" title="Knowledge Base" description="Everything your AI employee answers from." actions={
        <Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="kb-add-btn"><Plus className="h-4 w-4 mr-1" />Add entry</Button>
      } />
      <div className="grid gap-4">
        {list.length === 0 && <div className="surface p-10 text-sm text-muted-foreground text-center" data-testid="kb-empty">No entries yet. Add FAQs, policies, scripts.</div>}
        {list.map((k) => (
          <div key={k.id} className="surface p-5" data-testid={`kb-row-${k.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium">{k.question}</div>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{k.answer}</p>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {(k.tags || []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(k.id)} data-testid={`kb-delete-${k.id}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="kb-modal">
          <DialogHeader><DialogTitle>New knowledge entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Question / Topic</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} data-testid="kb-question-input" /></div>
            <div className="space-y-1.5"><Label>Answer</Label><Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} data-testid="kb-answer-input" /></div>
            <div className="space-y-1.5"><Label>Tags (comma)</Label><Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="faq, pricing, hours" data-testid="kb-tags-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!form.question || !form.answer} data-testid="kb-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
