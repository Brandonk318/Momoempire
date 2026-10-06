import { useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Sparkles, TrendingDown, TrendingUp, Flame, DollarSign } from "lucide-react";

const QUICK = [
  "Why did revenue fall this month?",
  "Which leads haven't been followed up?",
  "How many calls were missed?",
  "What should I focus on this week?",
  "Which service should I promote?",
  "How are we doing vs last month?",
];

export default function BusinessAdvisor() {
  const [snapshot, setSnapshot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { api.get("/advisor/snapshot").then((r) => setSnapshot(r.data)).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const { data } = await api.post("/advisor/chat", { message: text, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSending(false); }
  };

  const stat = (label, value, icon, cls = "") => (
    <div className={`surface p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <div className="overline">{label}</div>
        {icon}
      </div>
      <div className="font-display text-2xl mt-1 tracking-tight">{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]" data-testid="advisor-page">
      <PageHeader eyebrow="Intelligence" title="Business Advisor" description="Ask anything about your business. Answers come from your actual data." />

      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {stat("Revenue 30d", `$${snapshot.revenue_30d}`, <DollarSign className="h-4 w-4 text-muted-foreground" />)}
          {stat("Vs prior",
            snapshot.revenue_change_pct == null ? "—" : `${snapshot.revenue_change_pct > 0 ? "+" : ""}${snapshot.revenue_change_pct}%`,
            snapshot.revenue_change_pct && snapshot.revenue_change_pct < 0 ? <TrendingDown className="h-4 w-4 text-rose-500" /> : <TrendingUp className="h-4 w-4 text-emerald-500" />)}
          {stat("Unanswered leads", snapshot.unanswered_leads_over_24h, <Flame className="h-4 w-4 text-amber-500" />, snapshot.unanswered_leads_over_24h > 0 ? "border-amber-200 bg-amber-50/60" : "")}
          {stat("Missed calls 30d", snapshot.missed_calls_30d, null)}
          {stat("Upcoming", snapshot.upcoming_appointments, null)}
        </div>
      )}

      <div className="surface flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="advisor-messages">
          {messages.length === 0 && (
            <div className="h-full grid place-items-center">
              <div className="text-center max-w-md">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 mx-auto mb-4 grid place-items-center text-white"><Sparkles className="h-6 w-6" /></div>
                <div className="font-display text-2xl">Ask me anything about your business.</div>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-[12px] px-3 py-1.5 rounded-full border border-border hover:bg-muted" data-testid={`advisor-quick-${q.slice(0,8)}`}>{q}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role !== "user" && <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shrink-0" />}
              <div className={`rounded-xl px-4 py-3 max-w-[70%] text-[14px] whitespace-pre-wrap ${m.role === "user" ? "bg-foreground text-background" : "bg-muted"}`}>{m.content}</div>
            </div>
          ))}
          {sending && <div className="text-xs text-muted-foreground">Thinking…</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask your advisor…" data-testid="advisor-input" />
          <Button className="btn-tenant" onClick={() => send()} disabled={sending || !input.trim()} data-testid="advisor-send-btn"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
