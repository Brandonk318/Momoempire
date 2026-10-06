import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Rocket, Gift, Copy, PlayCircle } from "lucide-react";

function DigestTab() {
  const [d, setD] = useState(null);
  const [sending, setSending] = useState(false);
  useEffect(() => { api.get("/growth/digest/preview").then((r) => setD(r.data)); }, []);
  const sendNow = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/growth/digest/send", {});
      toast.success(`Digest ${data.status} → ${data.to}`);
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSending(false); }
  };
  if (!d) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="grid grid-cols-12 gap-5" data-testid="digest-tab">
      <div className="col-span-12 lg:col-span-7 surface p-6">
        <div className="overline">{d.tenant_name || "Your business"} · {d.period}</div>
        <div className="font-display text-2xl mt-1">This week at a glance</div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          {Object.entries(d.stats || {}).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border p-3" data-testid={`digest-stat-${k.replace(/\W+/g, "-")}`}>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="font-display text-2xl mt-1">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="overline mb-2">What stood out</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {(d.highlights || []).map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
        {(d.tips || []).length > 0 && (
          <div className="mt-6">
            <div className="overline mb-2">Try this week</div>
            <ul className="list-disc pl-5 text-sm space-y-1 text-foreground/80">
              {d.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="col-span-12 lg:col-span-5 surface p-6">
        <div className="overline">Email it</div>
        <div className="font-display text-xl mt-1">Weekly owner digest</div>
        <p className="text-sm text-muted-foreground mt-2">We send this to your workspace contact email every Monday at 9am local. Tap below to send one now.</p>
        <Button className="btn-tenant mt-4" onClick={sendNow} disabled={sending} data-testid="digest-send-btn">
          <Mail className="h-4 w-4 mr-1" />{sending ? "Sending…" : "Send to me now"}
        </Button>
      </div>
    </div>
  );
}

function WinbackTab() {
  const [form, setForm] = useState({ days_inactive: 90, channel: "sms", message: "Hi {name} — {business} here. It's been a while. Want to come back for 15% off this month?" });
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const loadHist = () => api.get("/growth/campaigns").then((r) => setHistory(r.data.filter((c) => c.type === "winback")));
  useEffect(() => { loadHist(); }, []);
  const previewRun = async () => {
    try { const { data } = await api.post("/growth/winback/preview", form); setPreview(data); } catch (e) { toast.error(errMessage(e)); }
  };
  const sendAll = async () => {
    setRunning(true);
    try {
      const { data } = await api.post("/growth/winback/run", { ...form, dry_run: false });
      toast.success(`Sent ${data.sent} / ${data.attempted}`); loadHist();
    } catch (e) { toast.error(errMessage(e)); }
    finally { setRunning(false); }
  };
  return (
    <div className="grid grid-cols-12 gap-5" data-testid="winback-tab">
      <div className="col-span-12 lg:col-span-7 surface p-6 space-y-4">
        <div>
          <Label>Haven't heard from them in</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" value={form.days_inactive} onChange={(e) => setForm({ ...form, days_inactive: Number(e.target.value) })} className="w-28" data-testid="winback-days" />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>
        <div>
          <Label>Channel</Label>
          <div className="flex gap-2 mt-1">
            {["sms", "email"].map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, channel: c })} data-testid={`winback-channel-${c}`}
                className={`px-3 py-2 rounded-lg text-[13px] border ${form.channel === c ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Message</Label>
          <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="winback-message" />
          <p className="text-[11px] text-muted-foreground mt-1">Placeholders: {`{name}, {business}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewRun} data-testid="winback-preview-btn">Preview</Button>
          <Button className="btn-tenant" onClick={sendAll} disabled={running || !preview || preview.eligible === 0} data-testid="winback-send-btn">
            <Rocket className="h-4 w-4 mr-1" />Send to {preview?.eligible || 0} customers
          </Button>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-5 surface p-6">
        <div className="overline">Preview</div>
        {preview ? (
          <>
            <div className="font-display text-2xl mt-1">{preview.eligible} eligible</div>
            <ul className="divide-y divide-border mt-3 max-h-[260px] overflow-y-auto">
              {(preview.sample || []).map((c) => (
                <li key={c.id} className="py-2 text-sm" data-testid={`winback-sample-${c.id}`}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{c.phone || c.email}</div>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">Click Preview to see who'll get the message.</p>}
        <div className="overline mt-6 mb-2">Past campaigns</div>
        <ul className="divide-y divide-border">
          {history.map((h) => (
            <li key={h.id} className="py-2 text-sm" data-testid={`campaign-${h.id}`}>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{h.result?.channel}</Badge>
                <span>{h.result?.sent}/{h.result?.attempted} sent</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
          {history.length === 0 && <li className="py-3 text-sm text-muted-foreground text-center">No campaigns yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function ReferralsTab() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const load = () => api.get("/growth/referrals").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const issue = async () => {
    try {
      await api.post("/growth/referrals/issue", { customer_name: name });
      setName(""); load(); toast.success("Referral code created");
    } catch (e) { toast.error(errMessage(e)); }
  };
  const copyLink = (code) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url); toast.success("Referral link copied");
  };
  return (
    <div data-testid="referrals-tab">
      <div className="surface p-6">
        <div className="overline">Create a referral code</div>
        <div className="flex gap-2 mt-3">
          <Input placeholder="Customer name (optional)" value={name} onChange={(e) => setName(e.target.value)} data-testid="referral-name" />
          <Button className="btn-tenant" onClick={issue} data-testid="referral-issue-btn"><Gift className="h-4 w-4 mr-1" />Create code</Button>
        </div>
      </div>
      <div className="surface mt-4">
        <div className="px-5 py-3 overline border-b border-border">Codes</div>
        <ul className="divide-y divide-border">
          {list.map((r) => (
            <li key={r.id} className="px-5 py-3 flex items-center gap-3" data-testid={`referral-${r.id}`}>
              <code className="font-mono text-sm font-bold">{r.code}</code>
              <span className="text-sm text-muted-foreground flex-1 truncate">{r.customer_name || "unnamed"}</span>
              <Badge variant="secondary" className="font-mono text-[11px]">visits {r.visits}</Badge>
              <Badge variant="secondary" className="font-mono text-[11px]">conv {r.conversions}</Badge>
              <Button size="sm" variant="outline" onClick={() => copyLink(r.code)} data-testid={`referral-copy-${r.id}`}><Copy className="h-3 w-3 mr-1" />Copy link</Button>
            </li>
          ))}
          {list.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No codes yet.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function Growth() {
  return (
    <div data-testid="growth-page">
      <PageHeader eyebrow="Growth" title="Grow revenue" description="Weekly digest, win-back campaigns, and referrals — on autopilot." />
      <Tabs defaultValue="digest">
        <TabsList>
          <TabsTrigger value="digest" data-testid="growth-tab-digest">Weekly digest</TabsTrigger>
          <TabsTrigger value="winback" data-testid="growth-tab-winback">Win-back</TabsTrigger>
          <TabsTrigger value="referrals" data-testid="growth-tab-referrals">Referrals</TabsTrigger>
        </TabsList>
        <TabsContent value="digest"><DigestTab /></TabsContent>
        <TabsContent value="winback"><WinbackTab /></TabsContent>
        <TabsContent value="referrals"><ReferralsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
