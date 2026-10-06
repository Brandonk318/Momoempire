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
import { Mail, Rocket, Gift, Copy, PlayCircle, Sparkles, MessageSquareText, Sunrise, Share2 } from "lucide-react";

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
      <PageHeader eyebrow="Growth" title="Grow revenue" description="Weekly digest, win-back campaigns, referrals, and more — on autopilot." />
      <Tabs defaultValue="digest">
        <TabsList>
          <TabsTrigger value="digest" data-testid="growth-tab-digest">Weekly digest</TabsTrigger>
          <TabsTrigger value="winback" data-testid="growth-tab-winback">Win-back</TabsTrigger>
          <TabsTrigger value="referrals" data-testid="growth-tab-referrals">Referrals</TabsTrigger>
          <TabsTrigger value="postjob" data-testid="growth-tab-postjob">Post-job</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="growth-tab-reviews">Review replies</TabsTrigger>
          <TabsTrigger value="standup" data-testid="growth-tab-standup">Standup</TabsTrigger>
          <TabsTrigger value="social" data-testid="growth-tab-social">Social draft</TabsTrigger>
        </TabsList>
        <TabsContent value="digest"><DigestTab /></TabsContent>
        <TabsContent value="winback"><WinbackTab /></TabsContent>
        <TabsContent value="referrals"><ReferralsTab /></TabsContent>
        <TabsContent value="postjob"><PostJobTab /></TabsContent>
        <TabsContent value="reviews"><ReviewReplyTab /></TabsContent>
        <TabsContent value="standup"><StandupTab /></TabsContent>
        <TabsContent value="social"><SocialDraftTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PostJobTab() {
  const [runs, setRuns] = useState([]);
  const load = () => api.get("/growth/post-job/runs").then((r) => setRuns(r.data));
  useEffect(() => { load(); }, []);
  return (
    <div className="surface p-6" data-testid="postjob-tab">
      <div className="flex items-start justify-between">
        <div>
          <div className="overline"><Sparkles className="h-3.5 w-3.5 inline mr-1" />Post-job autopilot</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            When you mark an appointment <strong>Completed</strong>, the AI instantly texts the customer a
            thank-you + review link, then schedules a win-back nudge 60 days later. No action needed.
          </p>
        </div>
        <Button variant="outline" onClick={load} data-testid="postjob-refresh"><PlayCircle className="h-4 w-4 mr-1" />Refresh</Button>
      </div>
      <ul className="mt-5 divide-y divide-border">
        {runs.map((r) => (
          <li key={r.id} className="py-3 flex items-center gap-3" data-testid={`postjob-run-${r.id}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.customer_name} · {r.service}</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                thanks: sms={r.thanks_sent?.sms || "—"} email={r.thanks_sent?.email ? "sent" : "—"}
                {r.winback_scheduled_for ? ` · winback → ${new Date(r.winback_scheduled_for).toLocaleDateString()}` : ""}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
          </li>
        ))}
        {runs.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">No post-job runs yet. Mark an appointment Completed to fire the autopilot.</li>}
      </ul>
    </div>
  );
}

function ReviewReplyTab() {
  const [form, setForm] = useState({ review_text: "", rating: 5, customer_name: "" });
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const { data } = await api.post("/growth/review-response", form); setOut(data); } catch (e) { toast.error(errMessage(e)); }
    finally { setLoading(false); }
  };
  const copy = () => { navigator.clipboard.writeText(out.reply); toast.success("Reply copied"); };
  return (
    <div className="grid grid-cols-12 gap-5" data-testid="review-reply-tab">
      <div className="col-span-12 lg:col-span-7 surface p-6 space-y-3">
        <div className="overline"><MessageSquareText className="h-3.5 w-3.5 inline mr-1" />Paste a customer review</div>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="review-customer" />
          <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} data-testid="review-rating" />
        </div>
        <Textarea rows={5} placeholder="Paste the review text here..." value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} data-testid="review-text" />
        <Button className="btn-tenant" onClick={run} disabled={!form.review_text || loading} data-testid="review-draft-btn"><Sparkles className="h-4 w-4 mr-1" />{loading ? "Drafting…" : "Draft reply"}</Button>
      </div>
      <div className="col-span-12 lg:col-span-5 surface p-6">
        <div className="overline">AI-drafted reply</div>
        {out ? (
          <>
            <Badge variant="secondary" className="mt-2">{out.tone} · {out.method}</Badge>
            <p className="mt-3 text-sm italic">"{out.reply}"</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={copy} data-testid="review-copy-btn"><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">Paste a review on the left to see a draft reply here.</p>}
      </div>
    </div>
  );
}

function StandupTab() {
  const [p, setP] = useState(null);
  const [sending, setSending] = useState(false);
  const load = () => api.get("/growth/standup/preview").then((r) => setP(r.data));
  useEffect(() => { load(); }, []);
  const send = async () => {
    setSending(true);
    try { const { data } = await api.post("/growth/standup/send"); toast.success(`Standup sent: ${data.sent?.sms || "—"} / ${data.sent?.email ? "email" : "—"}`); } catch (e) { toast.error(errMessage(e)); }
    finally { setSending(false); }
  };
  if (!p) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="grid grid-cols-12 gap-5" data-testid="standup-tab">
      <div className="col-span-12 lg:col-span-7 surface p-6">
        <div className="overline"><Sunrise className="h-3.5 w-3.5 inline mr-1" />Today</div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border border-border p-3"><div className="text-[11px] uppercase text-muted-foreground">Appointments</div><div className="font-display text-2xl mt-1" data-testid="standup-appts">{p.appointments.length}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[11px] uppercase text-muted-foreground">Hot leads</div><div className="font-display text-2xl mt-1" data-testid="standup-hot">{p.hot_leads.length}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[11px] uppercase text-muted-foreground">Follow-ups queued</div><div className="font-display text-2xl mt-1" data-testid="standup-pending">{p.pending_followups}</div></div>
        </div>
        {p.appointments.length > 0 && (
          <ul className="mt-5 divide-y divide-border">
            {p.appointments.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <div className="font-medium">{a.customer_name} · {a.service_name}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(a.start_at).toLocaleTimeString()} · {a.customer_phone}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="col-span-12 lg:col-span-5 surface p-6">
        <div className="overline">Send me the standup</div>
        <p className="text-sm text-muted-foreground mt-2">We auto-send this to your workspace contact phone + email every morning. Tap below for an instant one.</p>
        <Button className="btn-tenant mt-4" onClick={send} disabled={sending} data-testid="standup-send-btn"><Sunrise className="h-4 w-4 mr-1" />{sending ? "Sending…" : "Send to me now"}</Button>
      </div>
    </div>
  );
}

function SocialDraftTab() {
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const { data } = await api.post("/growth/social/draft"); setOut(data); } catch (e) { toast.error(errMessage(e)); }
    finally { setLoading(false); }
  };
  const copy = () => { navigator.clipboard.writeText(out.caption + "\n\n" + (out.hashtags || []).join(" ")); toast.success("Caption copied"); };
  return (
    <div className="surface p-6" data-testid="social-tab">
      <div className="flex items-center justify-between">
        <div>
          <div className="overline"><Share2 className="h-3.5 w-3.5 inline mr-1" />Weekly social post</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            One-tap Facebook/Instagram caption drafted from this week's wins. Perfect for Monday mornings.
          </p>
        </div>
        <Button className="btn-tenant" onClick={run} disabled={loading} data-testid="social-draft-btn"><Sparkles className="h-4 w-4 mr-1" />{loading ? "Drafting…" : "Draft caption"}</Button>
      </div>
      {out && (
        <div className="mt-5 rounded-xl border border-border p-5" data-testid="social-result">
          <p className="whitespace-pre-wrap">{out.caption}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(out.hashtags || []).map((h) => <Badge key={h} variant="secondary" className="font-mono text-[11px]">{h}</Badge>)}
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={copy} data-testid="social-copy-btn"><Copy className="h-3.5 w-3.5 mr-1" />Copy caption + tags</Button>
        </div>
      )}
    </div>
  );
}
