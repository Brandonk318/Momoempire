import { useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Upload, FileText, Search } from "lucide-react";

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [tagsText, setTagsText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const fileRef = useRef(null);

  const load = () => {
    api.get("/tenants/knowledge").then((r) => setEntries(r.data));
    api.get("/tenants/knowledge-docs").then((r) => setDocs(r.data));
  };
  useEffect(() => { load(); }, []);

  const addEntry = async () => {
    try {
      await api.post("/tenants/knowledge", { ...form, tags: tagsText.split(",").map((x) => x.trim()).filter(Boolean) });
      toast.success("Entry added");
      setOpen(false); setForm({ question: "", answer: "" }); setTagsText("");
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const delEntry = async (id) => { if (!confirm("Delete?")) return; try { await api.delete(`/tenants/knowledge/${id}`); load(); } catch (e) { toast.error(errMessage(e)); } };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", uploadTitle || file.name);
      fd.append("tags", uploadTags);
      await api.post("/tenants/knowledge-docs", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Uploaded & indexed");
      setUploadTitle(""); setUploadTags("");
      e.target.value = "";
      load();
    } catch (err) { toast.error(errMessage(err)); }
    finally { setUploading(false); }
  };
  const delDoc = async (id) => { if (!confirm("Delete document?")) return; try { await api.delete(`/tenants/knowledge-docs/${id}`); load(); } catch (e) { toast.error(errMessage(e)); } };

  const search = async () => {
    if (!q) return;
    try {
      const { data } = await api.get("/tenants/knowledge-docs/search", { params: { q } });
      setHits(data);
    } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="knowledge-page">
      <PageHeader eyebrow="Intelligence" title="Knowledge Base" description="Everything your AI employee answers from — FAQs plus your uploaded documents." />
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries" data-testid="kb-tab-entries">FAQ entries ({entries.length})</TabsTrigger>
          <TabsTrigger value="docs" data-testid="kb-tab-docs">Documents ({docs.length})</TabsTrigger>
          <TabsTrigger value="search" data-testid="kb-tab-search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <div className="mb-4 flex justify-end"><Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="kb-add-btn"><Plus className="h-4 w-4 mr-1" />Add entry</Button></div>
          <div className="grid gap-4">
            {entries.length === 0 && <div className="surface p-10 text-sm text-muted-foreground text-center">No entries yet.</div>}
            {entries.map((k) => (
              <div key={k.id} className="surface p-5" data-testid={`kb-row-${k.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{k.question}</div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{k.answer}</p>
                    <div className="mt-3 flex gap-1.5 flex-wrap">{(k.tags || []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => delEntry(k.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="docs">
          <div className="surface p-6 mb-5 max-w-2xl">
            <div className="overline mb-3">Upload PDF, DOCX, TXT, MD</div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Title (optional)" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} data-testid="kb-upload-title" />
              <Input placeholder="tags, comma, separated" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} data-testid="kb-upload-tags" />
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={upload} accept=".pdf,.docx,.txt,.md" data-testid="kb-upload-file" />
            <Button className="btn-tenant mt-4" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="kb-upload-btn">
              <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading…" : "Choose file"}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Max 10MB. We extract text and chunk it so the AI can cite it.</p>
          </div>
          <div className="surface">
            {docs.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No documents yet. Upload a price sheet or policy to teach your AI.</div> : (
              <ul className="divide-y divide-border">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-5 px-6 py-4" data-testid={`kb-doc-${d.id}`}>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.filename} · {(d.size_bytes / 1024).toFixed(0)}KB · {d.chunk_count} chunks</div>
                    </div>
                    <div className="flex gap-1 flex-wrap">{(d.tags || []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                    <Button variant="ghost" size="icon" onClick={() => delDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="search">
          <div className="surface p-6">
            <div className="flex gap-2">
              <Input placeholder="Search your knowledge…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} data-testid="kb-search-input" />
              <Button className="btn-tenant" onClick={search} data-testid="kb-search-btn"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 space-y-3">
              {hits.map((h, i) => (
                <div key={i} className="rounded-lg border border-border p-4" data-testid={`kb-hit-${i}`}>
                  <div className="text-xs font-mono text-muted-foreground">{h.doc_title} · chunk {h.chunk_idx} · score {h.score}</div>
                  <div className="text-sm mt-2 whitespace-pre-wrap line-clamp-6">{h.content}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="kb-modal">
          <DialogHeader><DialogTitle>New knowledge entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Question / Topic</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} data-testid="kb-question-input" /></div>
            <div className="space-y-1.5"><Label>Answer</Label><Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} data-testid="kb-answer-input" /></div>
            <div className="space-y-1.5"><Label>Tags (comma)</Label><Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={addEntry} disabled={!form.question || !form.answer} data-testid="kb-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
