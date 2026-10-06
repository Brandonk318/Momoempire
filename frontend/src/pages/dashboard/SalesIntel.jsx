import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Flame, Snowflake, ThermometerSun, Plus, Trash2, Pencil, Clock, PlayCircle, Scissors } from "lucide-react";

const LABEL_COLOR = {
  hot: "bg-rose-100 text-rose-900",
  warm: "bg-amber-100 text-amber-900",
  cold: "bg-sky-100 text-sky-900",
};
const LABEL_ICON = { hot: Flame, warm: ThermometerSun, cold: Snowflake };

function LeadScoreBadge({ score }) {
  if (!score?.label) return null;
  const Icon = LABEL_ICON[score.label] || ThermometerSun;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${LABEL_COLOR[score.label]}`} title={score.reason}>
      <Icon className="h-3 w-3" /> {score.label} · {score.score}
    </span>
  );
}

function ScoredLeadsTab() {
  const [leads, setLeads] = useState([]);
  const [label, setLabel] = useState("");
  const load = () => api.get("/sales/leads/scored", { params: label ? { label } : {} }).then((r) => setLeads(r.data));
  useEffect(() => { load(); }, [label]); // eslint-disable-line

  return (
    <div className="space-y-4" data-testid="scored-leads-tab">
      <div className="flex items-center gap-2">
        {["", "hot", "warm", "cold"].map((l) => (
          <Button key={l || "all"} size="sm" variant={label === l ? "default" : "outline"} onClick={() => setLabel(l)} data-testid={`scored-filter-${l || "all"}`}>
            {l || "all"}
          </Button>
        ))}
      </div>
      <div className="surface">
        <ul className="divide-y divide-border">
          {leads.map((l) => (
            <li key={l.id} className="px-5 py-3 flex items-center gap-4" data-testid={`scored-lead-${l.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{l.phone || l.email || l.source}</div>
                {l.lead_score?.reason && <div className="text-[11px] text-muted-foreground mt-0.5 italic">{l.lead_score.reason}</div>}
              </div>
              <LeadScoreBadge score={l.lead_score} />
              <Button size="sm" variant="outline" onClick={async () => {
                try { const { data } = await api.post(`/sales/leads/${l.id}/schedule-followups`); toast.success(`Scheduled ${data.scheduled} follow-ups`); } catch (e) { toast.error(errMessage(e)); }
              }} data-testid={`schedule-${l.id}`}>Schedule follow-ups</Button>
            </li>
          ))}
          {leads.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No scored leads yet. End a simulated call to generate scores.</li>}
        </ul>
      </div>
    </div>
  );
}

const EMPTY_UPSELL = { name: "", description: "", triggers: "", pitch: "", estimated_price: "", global: false };

function UpsellsTab() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null); // null | { ...form, id? }
  const load = () => api.get("/sales/upsells").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = {
      name: open.name,
      description: open.description || "",
      triggers: (open.triggers || "").split(",").map((s) => s.trim()).filter(Boolean),
      pitch: open.pitch || "",
      estimated_price: open.estimated_price ? Number(open.estimated_price) : null,
      global: !!open.global,
    };
    try {
      if (open.id) await api.put(`/sales/upsells/${open.id}`, payload);
      else await api.post("/sales/upsells", payload);
      toast.success("Saved"); setOpen(null); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const remove = async (id) => { if (!window.confirm("Delete this upsell?")) return; try { await api.delete(`/sales/upsells/${id}`); load(); } catch (e) { toast.error(errMessage(e)); } };

  return (
    <div className="space-y-4" data-testid="upsells-tab">
      <div className="flex justify-end">
        <Button className="btn-tenant" onClick={() => setOpen({ ...EMPTY_UPSELL })} data-testid="upsell-add-btn"><Plus className="h-4 w-4 mr-1" />Add upsell</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((u) => (
          <div key={u.id} className="surface p-5" data-testid={`upsell-card-${u.id}`}>
            <div className="flex items-start justify-between">
              <div className="font-medium">{u.name}</div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setOpen({ ...u, triggers: (u.triggers || []).join(", "), estimated_price: u.estimated_price ?? "" })} data-testid={`upsell-edit-${u.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(u.id)} data-testid={`upsell-del-${u.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {u.description && <div className="text-xs text-muted-foreground mt-1">{u.description}</div>}
            <div className="mt-3 text-[11px] text-muted-foreground font-mono">
              triggers: {(u.triggers || []).join(", ") || "(global)"}
            </div>
            {u.pitch && <div className="mt-2 text-[13px] italic text-foreground/80">"{u.pitch}"</div>}
            {u.estimated_price != null && <div className="mt-2 text-xs">≈ ${u.estimated_price}</div>}
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full surface p-10 text-sm text-muted-foreground text-center">No upsells yet. Add one and the AI will suggest it when the matching service comes up.</div>}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent data-testid="upsell-modal">
          <DialogHeader><DialogTitle>{open?.id ? "Edit upsell" : "New upsell"}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={open.name} onChange={(e) => setOpen({ ...open, name: e.target.value })} placeholder="Water heater flush" data-testid="upsell-name" /></div>
              <div className="space-y-1.5"><Label>Trigger services (comma separated keywords)</Label><Input value={open.triggers} onChange={(e) => setOpen({ ...open, triggers: e.target.value })} placeholder="water heater, plumbing, maintenance" data-testid="upsell-triggers" /></div>
              <div className="space-y-1.5"><Label>AI pitch (what the AI says)</Label><Textarea rows={2} value={open.pitch} onChange={(e) => setOpen({ ...open, pitch: e.target.value })} placeholder="While we're there, want us to flush the water heater for $89?" data-testid="upsell-pitch" /></div>
              <div className="space-y-1.5"><Label>Estimated price (optional)</Label><Input type="number" value={open.estimated_price} onChange={(e) => setOpen({ ...open, estimated_price: e.target.value })} data-testid="upsell-price" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!open.global} onChange={(e) => setOpen({ ...open, global: e.target.checked })} /> Offer on every call (global)</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="btn-tenant" onClick={save} disabled={!open?.name} data-testid="upsell-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DEFAULT_STEPS = [
  { offset_hours: 24, channel: "sms", template: "Hi {name} — this is {business}. Following up on your call. Want me to book you in?" },
  { offset_hours: 72, channel: "sms", template: "Hey {name}, {business} here again. Still have openings this week." },
  { offset_hours: 168, channel: "sms", template: "Last check-in from {business}. Reply YES and I'll schedule you." },
];

function FollowupsTab() {
  const [cad, setCad] = useState({ enabled: true, steps: DEFAULT_STEPS });
  const [jobs, setJobs] = useState([]);
  const load = async () => {
    const [c, j] = await Promise.all([api.get("/sales/followups/cadence"), api.get("/sales/followups")]);
    setCad({ enabled: c.data.enabled !== false, steps: c.data.steps || DEFAULT_STEPS });
    setJobs(j.data);
  };
  useEffect(() => { load(); }, []);

  const saveCad = async () => {
    try {
      await api.put("/sales/followups/cadence", { enabled: cad.enabled, steps: cad.steps });
      toast.success("Cadence saved"); load();
    } catch (e) { toast.error(errMessage(e)); }
  };
  const addStep = () => setCad({ ...cad, steps: [...cad.steps, { offset_hours: 24, channel: "sms", template: "" }] });
  const delStep = (i) => setCad({ ...cad, steps: cad.steps.filter((_, idx) => idx !== i) });
  const runDue = async () => { try { const { data } = await api.post("/sales/followups/run-due"); toast.success(`Sent ${data.sent}`); load(); } catch (e) { toast.error(errMessage(e)); } };
  const cancel = async (id) => { try { await api.post(`/sales/followups/${id}/cancel`); load(); } catch (e) { toast.error(errMessage(e)); } };

  return (
    <div className="grid grid-cols-12 gap-5" data-testid="followups-tab">
      <div className="col-span-12 lg:col-span-7 surface p-6">
        <div className="flex items-center justify-between">
          <div className="overline">Cadence</div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cad.enabled} onChange={(e) => setCad({ ...cad, enabled: e.target.checked })} data-testid="cadence-enabled" /> enabled</label>
        </div>
        <div className="mt-4 space-y-3">
          {cad.steps.map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2" data-testid={`cadence-step-${i}`}>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                <Input type="number" className="h-8 w-24" value={s.offset_hours} onChange={(e) => { const steps = [...cad.steps]; steps[i].offset_hours = Number(e.target.value); setCad({ ...cad, steps }); }} />
                <span>hours after call ·</span>
                <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={s.channel} onChange={(e) => { const steps = [...cad.steps]; steps[i].channel = e.target.value; setCad({ ...cad, steps }); }}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => delStep(i)} data-testid={`cadence-del-${i}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <Textarea rows={2} value={s.template} onChange={(e) => { const steps = [...cad.steps]; steps[i].template = e.target.value; setCad({ ...cad, steps }); }} placeholder="Hi {name}, {business} here…" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={addStep} data-testid="cadence-add-step"><Plus className="h-3.5 w-3.5 mr-1" />Add step</Button>
          <Button className="btn-tenant ml-auto" onClick={saveCad} data-testid="cadence-save">Save cadence</Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Placeholders: {`{name}, {business}`}. Only hot / warm leads get auto-scheduled.</p>
      </div>

      <div className="col-span-12 lg:col-span-5 surface p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="overline">Upcoming nudges</div>
          <Button size="sm" variant="outline" onClick={runDue} data-testid="run-due-btn"><PlayCircle className="h-3.5 w-3.5 mr-1" />Run due now</Button>
        </div>
        <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
          {jobs.map((j) => (
            <li key={j.id} className="py-2.5 flex items-start gap-3" data-testid={`followup-job-${j.id}`}>
              <Badge variant={j.status === "sent" ? "default" : j.status === "cancelled" ? "secondary" : "outline"}>{j.status}</Badge>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate">{j.to}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(j.send_at).toLocaleString()}</div>
                <div className="text-[13px] mt-1 line-clamp-2">{j.body}</div>
              </div>
              {j.status === "scheduled" && <Button variant="ghost" size="icon" onClick={() => cancel(j.id)} data-testid={`followup-cancel-${j.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
            </li>
          ))}
          {jobs.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No follow-ups queued.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function SalesIntel() {
  return (
    <div data-testid="sales-intel-page">
      <PageHeader eyebrow="Intelligence" title="Sales intelligence" description="Scored leads, upsell library, follow-up cadence, and beat-the-quote guardrails." />
      <Tabs defaultValue="scored">
        <TabsList>
          <TabsTrigger value="scored" data-testid="sales-tab-scored">Hot / warm / cold</TabsTrigger>
          <TabsTrigger value="upsells" data-testid="sales-tab-upsells">Upsells</TabsTrigger>
          <TabsTrigger value="followups" data-testid="sales-tab-followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="discount" data-testid="sales-tab-discount">Beat the quote</TabsTrigger>
        </TabsList>
        <TabsContent value="scored"><ScoredLeadsTab /></TabsContent>
        <TabsContent value="upsells"><UpsellsTab /></TabsContent>
        <TabsContent value="followups"><FollowupsTab /></TabsContent>
        <TabsContent value="discount"><DiscountTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DiscountTab() {
  const [p, setP] = useState(null);
  const load = () => api.get("/sales/discount-policy").then((r) => setP(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      await api.put("/sales/discount-policy", {
        enabled: !!p.enabled,
        max_percent_off: Number(p.max_percent_off) || 0,
        max_absolute_cents: Number(p.max_absolute_cents) || 0,
        phrase: p.phrase || "",
        conditions: p.conditions || "",
      });
      toast.success("Discount policy saved — AI will respect these limits.");
    } catch (e) { toast.error(errMessage(e)); }
  };
  if (!p) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="surface p-6 max-w-2xl space-y-4" data-testid="discount-tab">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} data-testid="discount-enabled" />
        <Scissors className="h-4 w-4" /> Allow the AI to offer a one-time discount
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Max % off</Label>
          <Input type="number" value={p.max_percent_off} onChange={(e) => setP({ ...p, max_percent_off: e.target.value })} data-testid="discount-max-pct" />
        </div>
        <div className="space-y-1.5">
          <Label>Max $ off (cents)</Label>
          <Input type="number" value={p.max_absolute_cents} onChange={(e) => setP({ ...p, max_absolute_cents: e.target.value })} data-testid="discount-max-cents" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>AI script</Label>
        <Textarea rows={2} value={p.phrase} onChange={(e) => setP({ ...p, phrase: e.target.value })} data-testid="discount-phrase" />
        <p className="text-[11px] text-muted-foreground">Placeholder: {`{amount}`} — the AI will substitute a dollar amount within your caps.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Only offer when</Label>
        <Input value={p.conditions} onChange={(e) => setP({ ...p, conditions: e.target.value })} data-testid="discount-conditions" />
      </div>
      <Button className="btn-tenant" onClick={save} data-testid="discount-save">Save guardrails</Button>
    </div>
  );
}

export { LeadScoreBadge };
