import { useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, MessageSquarePlus, PhoneIncoming } from "lucide-react";

export default function Messages() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [simForm, setSimForm] = useState({ from: "", name: "", body: "" });
  const endRef = useRef(null);

  const loadThreads = () => api.get("/conversations/sms/threads").then((r) => setThreads(r.data));
  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const openThread = async (t) => {
    setActive(t);
    const { data } = await api.get(`/conversations/${t.id}`);
    setMessages(data.messages);
  };

  const send = async () => {
    if (!active || !input.trim()) return;
    try {
      await api.post("/conversations/sms/send", { to: active.caller_phone, body: input, name: active.caller_name });
      setInput("");
      await openThread(active);
      loadThreads();
    } catch (e) { toast.error(errMessage(e)); }
  };

  const simulateInbound = async () => {
    try {
      const { data } = await api.post("/conversations/sms/inbound-sim", simForm);
      toast.success(`AI replied: ${data.reply.slice(0, 60)}…`);
      setSimOpen(false);
      setSimForm({ from: "", name: "", body: "" });
      loadThreads();
    } catch (e) { toast.error(errMessage(e)); }
  };

  return (
    <div data-testid="messages-page">
      <PageHeader
        eyebrow="Communications"
        title="Messages"
        description="Two-way SMS with your customers. The AI drafts and sends replies for you."
        actions={<Button className="btn-tenant" onClick={() => setSimOpen(true)} data-testid="sim-sms-btn"><PhoneIncoming className="h-4 w-4 mr-2" />Simulate inbound SMS</Button>}
      />
      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4 surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border overline">Threads</div>
          <ul className="divide-y divide-border max-h-[560px] overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button onClick={() => openThread(t)} className={`w-full text-left px-5 py-3 hover:bg-muted ${active?.id === t.id ? "bg-muted" : ""}`} data-testid={`thread-${t.id}`}>
                  <div className="font-medium truncate">{t.caller_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.caller_phone}</div>
                </button>
              </li>
            ))}
            {threads.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No conversations yet.</li>}
          </ul>
        </aside>
        <section className="col-span-12 lg:col-span-8 surface flex flex-col overflow-hidden h-[640px]">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Pick a thread to open.</div>
          ) : (
            <>
              <header className="px-5 py-4 border-b border-border">
                <div className="font-medium">{active.caller_name || "Unknown"}</div>
                <div className="text-xs text-muted-foreground font-mono">{active.caller_phone}</div>
              </header>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === "ai" ? "justify-end" : ""}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-[14px] whitespace-pre-wrap ${m.role === "ai" ? "bg-foreground text-background" : "bg-muted"}`}>{m.content}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply…" data-testid="sms-input" />
                <Button className="btn-tenant" onClick={send} disabled={!input.trim()} data-testid="sms-send-btn"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent data-testid="sim-sms-modal">
          <DialogHeader><DialogTitle>Simulate inbound SMS</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><label className="text-sm">From (phone)</label><Input value={simForm.from} onChange={(e) => setSimForm({ ...simForm, from: e.target.value })} placeholder="+1 555 010 0124" data-testid="sim-sms-from" /></div>
            <div className="space-y-1.5"><label className="text-sm">Name</label><Input value={simForm.name} onChange={(e) => setSimForm({ ...simForm, name: e.target.value })} data-testid="sim-sms-name" /></div>
            <div className="space-y-1.5"><label className="text-sm">Message</label><Input value={simForm.body} onChange={(e) => setSimForm({ ...simForm, body: e.target.value })} placeholder="Hey, can I book a tune-up for Thursday?" data-testid="sim-sms-body" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSimOpen(false)}>Cancel</Button>
            <Button className="btn-tenant" onClick={simulateInbound} disabled={!simForm.from || !simForm.body} data-testid="sim-sms-start-btn">Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
