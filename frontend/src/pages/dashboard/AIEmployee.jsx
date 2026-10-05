import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AIEmployee() {
  const [ai, setAi] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/tenants/me").then((r) => setAi(r.data?.ai_employee || {
      name: "Alex", personality: "Warm, professional, concise.", voice: "neutral",
      greeting: "Hi! Thanks for calling. How can I help you today?", enabled: true,
    })).catch(() => {});
  }, []);
  if (!ai) return null;
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/tenants/me", { ai_employee: ai });
      toast.success("AI Employee updated");
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSaving(false); }
  };
  return (
    <div data-testid="ai-employee-page">
      <PageHeader eyebrow="Workspace" title="AI Employee" description="Tune your digital teammate's voice, tone, and greeting." actions={
        <Button className="btn-tenant" onClick={save} disabled={saving} data-testid="ai-save-btn">{saving ? "Saving…" : "Save changes"}</Button>
      } />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 surface p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Active</div>
              <div className="text-xs text-muted-foreground">Turn the AI employee off during maintenance.</div>
            </div>
            <Switch checked={ai.enabled} onCheckedChange={(v) => setAi({ ...ai, enabled: v })} data-testid="ai-enabled-switch" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={ai.name || ""} onChange={(e) => setAi({ ...ai, name: e.target.value })} data-testid="ai-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Personality</Label>
            <Textarea rows={3} value={ai.personality || ""} onChange={(e) => setAi({ ...ai, personality: e.target.value })} data-testid="ai-personality-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Voice</Label>
            <div className="flex gap-2">
              {["neutral", "warm", "crisp", "deep"].map((v) => (
                <button key={v} type="button" onClick={() => setAi({ ...ai, voice: v })} data-testid={`ai-voice-${v}`}
                  className={`px-3 py-2 rounded-lg text-[13px] border ${ai.voice === v ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{v}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Greeting</Label>
            <Textarea rows={2} value={ai.greeting || ""} onChange={(e) => setAi({ ...ai, greeting: e.target.value })} data-testid="ai-greeting-input" />
          </div>
        </div>
        <aside className="col-span-12 lg:col-span-5 surface p-7">
          <div className="overline mb-3">Preview</div>
          <div className="rounded-xl bg-muted p-5 min-h-[200px]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
              <div>
                <div className="font-medium">{ai.name || "Alex"}</div>
                <div className="text-xs text-muted-foreground">{ai.voice || "neutral"} voice</div>
              </div>
            </div>
            <p className="mt-5 text-sm">"{ai.greeting || "Hi there."}"</p>
            <p className="text-xs text-muted-foreground mt-3">{ai.personality || ""}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
