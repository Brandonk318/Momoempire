import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PhoneForwarded, Shield } from "lucide-react";

export default function PhoneNumbers() {
  const [config, setConfig] = useState({ enabled: false, config: { account_sid: "", auth_token: "", phone_number: "" } });
  const [missing, setMissing] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/tenants/integrations");
    const twilio = data.find((d) => d.key === "twilio");
    if (twilio) setConfig(twilio);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/tenants/integrations", { key: "twilio", enabled: config.enabled, config: config.config });
      setConfig(data.integration);
      setMissing(data.missing);
      toast.success(data.missing.length ? "Saved. Missing: " + data.missing.join(", ") : "Twilio connected");
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSaving(false); }
  };

  const demoActive = !config.enabled || config.status !== "connected";

  return (
    <div data-testid="phone-numbers-page">
      <PageHeader eyebrow="Setup" title="Phone Numbers" description="Connect Twilio to go live with calls and SMS." />

      {demoActive && (
        <div className="surface p-5 mb-6 flex items-center gap-4 border-amber-200 bg-amber-50 text-amber-900">
          <Shield className="h-5 w-5" />
          <div>
            <div className="font-medium">Running in demo mode</div>
            <div className="text-sm">You can simulate calls and SMS end-to-end. Add Twilio credentials below to accept real inbound calls.</div>
          </div>
        </div>
      )}

      <div className="surface p-7 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <PhoneForwarded className="h-5 w-5" />
            <div>
              <div className="font-medium">Twilio</div>
              <div className="text-xs text-muted-foreground">Account SID, Auth Token, and a phone number.</div>
            </div>
          </div>
          <Badge className={config.status === "connected" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"} data-testid="twilio-status-badge">{config.status || "disconnected"}</Badge>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Account SID</Label><Input value={config.config?.account_sid || ""} onChange={(e) => setConfig({ ...config, config: { ...config.config, account_sid: e.target.value } })} placeholder="ACxxxxxxxxxxxx" data-testid="twilio-sid-input" /></div>
          <div className="space-y-1.5"><Label>Auth Token</Label><Input type="password" value={config.config?.auth_token || ""} onChange={(e) => setConfig({ ...config, config: { ...config.config, auth_token: e.target.value } })} data-testid="twilio-token-input" /></div>
          <div className="space-y-1.5"><Label>Phone number</Label><Input value={config.config?.phone_number || ""} onChange={(e) => setConfig({ ...config, config: { ...config.config, phone_number: e.target.value } })} placeholder="+15551234567" data-testid="twilio-phone-input" /></div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} data-testid="twilio-enabled-switch" />
              Enabled
            </label>
            <Button className="btn-tenant" onClick={save} disabled={saving} data-testid="twilio-save-btn">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
