import { useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, PhoneCall, PhoneOff, Send, UserPlus, CalendarPlus, Headphones, Sparkles } from "lucide-react";
import { LeadScoreBadge } from "./SalesIntel";

const STATUS_COLOR = {
  active: "bg-emerald-100 text-emerald-900",
  completed: "bg-slate-200 text-slate-800",
  escalated: "bg-amber-100 text-amber-900",
  voicemail: "bg-blue-100 text-blue-900",
  missed: "bg-rose-100 text-rose-900",
  failed: "bg-rose-100 text-rose-900",
};

const ACTION_LABEL = {
  book_appointment: { icon: CalendarPlus, text: "Appointment booked" },
  create_lead: { icon: UserPlus, text: "Lead captured" },
  escalate_to_human: { icon: Headphones, text: "Escalated to human" },
  take_voicemail: { icon: PhoneOff, text: "Voicemail taken" },
  take_message: { icon: Send, text: "Message taken" },
  end_call: { icon: PhoneOff, text: "Call ended" },
};

export default function Calls() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simForm, setSimForm] = useState({ caller_name: "", caller_phone: "" });
  const [listening, setListening] = useState(false);
  const [extracted, setExtracted] = useState(null); // {address, phone, email, service_requested, urgency, notes_summary}
  const [extracting, setExtracting] = useState(false);
  const recRef = useRef(null);
  const endRef = useRef(null);

  const load = () => api.get("/conversations", { params: { channel: "call" } }).then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const openConv = async (c) => {
    setActive(c);
    setExtracted(c?.extracted_fields || null);
    const { data } = await api.get(`/conversations/${c.id}`);
    setMessages(data.messages);
  };

  const startSim = async () => {
    try {
      const { data } = await api.post("/conversations/start", {
        channel: "call",
        caller_name: simForm.caller_name || "Jamie Caller",
        caller_phone: simForm.caller_phone || "+1 555 010 0199",
        is_simulation: true,
      });
      setSimOpen(false);
      load();
      await openConv(data.conversation);
      toast.success("Call started — type what the caller says.");
    } catch (e) { toast.error(errMessage(e)); }
  };

  const send = async () => {
    if (!active || !input.trim() || sending) return;
    setSending(true);
    const text = input;
    setInput("");
    // optimistic
    setMessages((m) => [...m, { id: `t-${Date.now()}`, role: "caller", content: text, created_at: new Date().toISOString() }]);
    try {
      const { data } = await api.post(`/conversations/${active.id}/caller-turn`, { text });
      setMessages((m) => [...m, { id: `r-${Date.now()}`, role: "ai", content: data.reply, action: data.action, created_at: new Date().toISOString() }]);
      if (data.ended) {
        toast.success("Call ended");
        load();
      }
      if (data.action) {
        const lbl = ACTION_LABEL[data.action.type];
        if (lbl) toast.success(lbl.text);
      }
      setActive(data.conversation);
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSending(false); }
  };

  const endCall = async () => {
    if (!active) return;
    try {
      await api.post(`/conversations/${active.id}/end`);
      toast.success("Call ended");
      load();
      openConv(active);
    } catch (e) { toast.error(errMessage(e)); }
  };

  const extractFields = async () => {
    if (!active) return;
    setExtracting(true);
    try {
      const { data } = await api.post(`/sales/conversations/${active.id}/extract`);
      setExtracted(data.fields);
      toast.success("AI pulled out call details");
    } catch (e) { toast.error(errMessage(e)); }
    finally { setExtracting(false); }
  };

  const applyFields = async () => {
    if (!active || !extracted) return;
    try {
      await api.post(`/sales/conversations/${active.id}/apply-fields`, {
        name: active.caller_name || "",
        phone: extracted.phone || active.caller_phone || "",
        email: extracted.email || "",
        address: extracted.address || "",
        service_requested: extracted.service_requested || "",
        urgency: extracted.urgency || "",
        notes: extracted.notes_summary || "",
      });
      toast.success("CRM updated");
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  const scoreCall = async () => {
    if (!active) return;
    try {
      const { data } = await api.post(`/sales/conversations/${active.id}/score`);
      setActive({ ...active, lead_score: data.score });
      toast.success(`Scored ${data.score.label} (${data.score.score})`);
      load();
    } catch (e) { toast.error(errMessage(e)); }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Mic unsupported in this browser — type instead"); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setInput((prev) => (prev ? prev + " " : "") + t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div data-testid="calls-page">
      <PageHeader
        eyebrow="Communications"
        title="Calls"
        description="Your AI receptionist is on the line. Simulate an inbound call to see the playbook."
        actions={<Button className="btn-tenant" onClick={() => setSimOpen(true)} data-testid="simulate-call-btn"><PhoneCall className="h-4 w-4 mr-2" />Simulate call</Button>}
      />

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4 surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border overline">Recent calls</div>
          <ul className="divide-y divide-border max-h-[560px] overflow-y-auto" data-testid="calls-list">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => openConv(c)} className={`w-full text-left px-5 py-3 hover:bg-muted ${active?.id === c.id ? "bg-muted" : ""}`} data-testid={`call-item-${c.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{c.caller_name || "Unknown"}</div>
                    <Badge className={`${STATUS_COLOR[c.status]} text-[10px]`}>{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{c.caller_phone || "—"}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{c.summary || "Click to open"}</div>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No calls yet. Simulate your first.</li>}
          </ul>
        </aside>

        <section className="col-span-12 lg:col-span-8 surface flex flex-col overflow-hidden h-[640px]">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Pick a call to see the transcript.</div>
          ) : (
            <>
              <header className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium flex items-center gap-2"><Phone className="h-4 w-4" />{active.caller_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{active.caller_phone} · {active.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <LeadScoreBadge score={active.lead_score} />
                  {active.status !== "active" && (
                    <>
                      <Button size="sm" variant="outline" onClick={scoreCall} data-testid="score-call-btn"><Sparkles className="h-3.5 w-3.5 mr-1" />Re-score</Button>
                      <Button size="sm" variant="outline" onClick={extractFields} disabled={extracting} data-testid="extract-fields-btn"><Sparkles className="h-3.5 w-3.5 mr-1" />{extracting ? "Reading…" : "Auto-fill CRM"}</Button>
                    </>
                  )}
                  {active.status === "active" && <Button variant="outline" onClick={endCall} data-testid="end-call-btn"><PhoneOff className="h-4 w-4 mr-1" />End call</Button>}
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-5 space-y-3" data-testid="call-transcript">
                {extracted && (
                  <div className="rounded-xl border border-border bg-amber-50/40 p-3 mb-3" data-testid="extracted-panel">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5" />Call details the AI heard
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] font-mono">
                      {["phone", "email", "address", "service_requested", "urgency", "preferred_time", "budget_hint"].map((k) => (
                        extracted[k] ? <div key={k}><span className="text-muted-foreground">{k}:</span> {extracted[k]}</div> : null
                      ))}
                    </div>
                    {extracted.notes_summary && <div className="mt-2 text-[12px] italic">{extracted.notes_summary}</div>}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="btn-tenant" onClick={applyFields} data-testid="apply-fields-btn">Save to CRM</Button>
                      <Button size="sm" variant="ghost" onClick={() => setExtracted(null)}>Dismiss</Button>
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === "caller" ? "justify-end" : ""}`}>
                    {m.role === "ai" && <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shrink-0 mt-1" />}
                    <div className="max-w-[75%]">
                      <div className={`rounded-xl px-4 py-2.5 text-[14px] whitespace-pre-wrap ${m.role === "caller" ? "bg-foreground text-background" : m.role === "system" ? "bg-muted text-muted-foreground text-xs" : "bg-muted"}`}>{m.content}</div>
                      {m.action && ACTION_LABEL[m.action.type] && (() => {
                        const Icon = ACTION_LABEL[m.action.type].icon;
                        return <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1"><Icon className="h-3 w-3" />{ACTION_LABEL[m.action.type].text}</div>;
                      })()}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Button variant={listening ? "default" : "outline"} size="icon" onClick={toggleMic} disabled={active.status !== "active"} data-testid="mic-btn" aria-label="Mic">
                  <span className={`inline-block h-2 w-2 rounded-full ${listening ? "bg-rose-500 animate-pulse" : "bg-foreground"}`} />
                </Button>
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={active.status === "active" ? (listening ? "Listening…" : "Type what the caller says…") : "This call has ended"} disabled={active.status !== "active" || sending} data-testid="call-input" />
                <Button className="btn-tenant" onClick={send} disabled={active.status !== "active" || sending || !input.trim()} data-testid="call-send-btn"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent data-testid="sim-call-modal">
          <DialogHeader><DialogTitle>Simulate an inbound call</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><label className="text-sm">Caller name</label><Input value={simForm.caller_name} onChange={(e) => setSimForm({ ...simForm, caller_name: e.target.value })} placeholder="Jamie Caller" data-testid="sim-caller-name" /></div>
            <div className="space-y-1.5"><label className="text-sm">Caller phone</label><Input value={simForm.caller_phone} onChange={(e) => setSimForm({ ...simForm, caller_phone: e.target.value })} placeholder="+1 555 010 0199" data-testid="sim-caller-phone" /></div>
            <p className="text-xs text-muted-foreground">In demo mode you type what the caller says. Connect Twilio in Phone Numbers to go live.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSimOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={startSim} data-testid="sim-start-btn">Start call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
