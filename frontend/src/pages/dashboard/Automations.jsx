import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Play, Trash2, Sparkles } from "lucide-react";

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [running, setRunning] = useState(null);
  const [installing, setInstalling] = useState(false);

  const load = () => api.get("/tenants/automation-rules").then((r) => setRules(r.data));
  useEffect(() => { load(); }, []);

  const installStarters = async () => {
    setInstalling(true);
    try { const { data } = await api.post("/tenants/automation-rules/install-starters"); toast.success(`Installed ${data.created} starter rules`); load(); }
    catch (e) { toast.error(errMessage(e)); }
    finally { setInstalling(false); }
  };
  const toggle = async (r) => { try { await api.put(`/tenants/automation-rules/${r.id}`, { ...r, enabled: !r.enabled }); load(); } catch (e) { toast.error(errMessage(e)); } };
  const del = async (id) => { if (!confirm("Delete?")) return; try { await api.delete(`/tenants/automation-rules/${id}`); load(); } catch (e) { toast.error(errMessage(e)); } };
  const run = async (id) => {
    setRunning(id);
    try { const { data } = await api.post(`/tenants/automation-rules/${id}/run`); toast.success(`Ran — ${data.executed} actions`); load(); }
    catch (e) { toast.error(errMessage(e)); }
    finally { setRunning(null); }
  };

  return (
    <div data-testid="automations-page">
      <PageHeader eyebrow="Setup" title="Automations" description="Rules that run your office when you're not watching." actions={
        <Button variant="outline" onClick={installStarters} disabled={installing} data-testid="install-starters-btn"><Sparkles className="h-4 w-4 mr-1" />Install starter pack</Button>
      } />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" data-testid="auto-tab-rules">Rules ({rules.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <div className="surface">
            {rules.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No rules yet — install the starter pack to go live in one click.</div> : (
              <ul className="divide-y divide-border">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center gap-5 px-6 py-4" data-testid={`rule-row-${r.id}`}>
                    <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} data-testid={`rule-switch-${r.id}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">on {r.trigger} → {r.actions.length} action{r.actions.length !== 1 && 's'}</div>
                    </div>
                    <Badge variant="secondary">ran {r.run_count || 0}×</Badge>
                    <Button variant="outline" size="sm" onClick={() => run(r.id)} disabled={running === r.id || !r.enabled} data-testid={`rule-run-${r.id}`}><Play className="h-3 w-3 mr-1" />{running === r.id ? "Running…" : "Run now"}</Button>
                    <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
