import { useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";

export default function BusinessAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const { data } = await api.post("/advisor/chat", { message: msg, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSending(false);
    }
  };

  const QUICK = [
    "What should I focus on this week?",
    "How do I get more 5-star reviews?",
    "Draft a 24-hour follow-up SMS",
    "How should I price a service bundle?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]" data-testid="advisor-page">
      <PageHeader
        eyebrow="Intelligence"
        title="Business Advisor"
        description="Ask anything about your business. Powered by GPT-6 Sol."
      />
      <div className="surface flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="advisor-messages">
          {messages.length === 0 && (
            <div className="h-full grid place-items-center">
              <div className="text-center max-w-md">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 mx-auto mb-4 grid place-items-center text-white"><Sparkles className="h-6 w-6" /></div>
                <div className="font-display text-2xl">How can I help your business today?</div>
                <p className="text-sm text-muted-foreground mt-2">Pick a starter or ask anything.</p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => setInput(q)} data-testid={`advisor-quick-${q.slice(0,8)}`} className="text-[12px] px-3 py-1.5 rounded-full border border-border hover:bg-muted">{q}</button>
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
          <Button className="btn-tenant" onClick={send} disabled={sending || !input.trim()} data-testid="advisor-send-btn"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
