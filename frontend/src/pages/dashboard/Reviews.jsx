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
import { Star, Plus, Copy } from "lucide-react";

export default function Reviews() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", channel: "sms", message: "" });
  const load = () => api.get("/tenants/reviews").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const send = async () => {
    try {
      await api.post("/tenants/reviews", form);
      toast.success("Review request sent");
      setOpen(false); setForm({ customer_name: "", customer_phone: "", customer_email: "", channel: "sms", message: "" });
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  const copyLink = (t) => {
    const url = `${window.location.origin}/reviews/${t.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Review link copied");
  };

  const avg = (() => {
    const rated = list.filter((r) => r.rating);
    if (!rated.length) return null;
    return (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1);
  })();

  return (
    <div data-testid="reviews-page">
      <PageHeader eyebrow="Business" title="Reviews" description="Ask customers for reviews. Watch the stars roll in." actions={
        <Button className="btn-tenant" onClick={() => setOpen(true)} data-testid="review-request-btn"><Plus className="h-4 w-4 mr-1" />Request a review</Button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="surface p-5"><div className="overline">Sent</div><div className="font-display text-3xl mt-1">{list.length}</div></div>
        <div className="surface p-5"><div className="overline">Responded</div><div className="font-display text-3xl mt-1">{list.filter((r) => r.status === "responded").length}</div></div>
        <div className="surface p-5"><div className="overline">Avg rating</div><div className="font-display text-3xl mt-1 flex items-center gap-1">{avg || "—"}{avg && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}</div></div>
        <div className="surface p-5"><div className="overline">5★ reviews</div><div className="font-display text-3xl mt-1">{list.filter((r) => r.rating === 5).length}</div></div>
      </div>

      <div className="surface">
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No requests yet. Ask your first customer for a review.</div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-6 px-6 py-4" data-testid={`review-row-${r.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{r.customer_phone || r.customer_email || "—"} · via {r.channel}</div>
                  {r.comment && <div className="text-sm mt-1">"{r.comment}"</div>}
                </div>
                <div className="w-24 text-right">
                  {r.rating ? (
                    <div className="flex items-center justify-end gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  ) : <Badge variant="secondary">pending</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyLink(r)} data-testid={`review-copy-${r.id}`} aria-label="Copy link"><Copy className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="review-modal">
          <DialogHeader><DialogTitle>Request a review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="review-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} data-testid="review-phone-input" /></div>
              <div className="space-y-1.5"><Label>Email (optional)</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} data-testid="review-email-input" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <div className="flex gap-2">
                {["sms", "email"].map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, channel: c })} data-testid={`review-ch-${c}`}
                    className={`px-3 py-2 rounded-lg text-[13px] border ${form.channel === c ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Message (optional override)</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={send} disabled={!form.customer_name} data-testid="review-send-btn">Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
