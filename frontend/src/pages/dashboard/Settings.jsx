import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const PRESET_COLORS = ["#0A0A0A", "#2563EB", "#059669", "#DC2626", "#7C3AED", "#D97706", "#0F766E", "#DB2777"];

export default function Settings() {
  const [tenant, setTenant] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/tenants/me").then((r) => setTenant(r.data));
  }, []);

  if (!tenant) return null;
  const branding = tenant.branding || {};
  const setBranding = (patch) => setTenant({ ...tenant, branding: { ...branding, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/tenants/me", {
        name: tenant.name, description: tenant.description, contact_phone: tenant.contact_phone,
        contact_email: tenant.contact_email || null, website: tenant.website,
        branding: tenant.branding,
      });
      toast.success("Workspace saved");
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSaving(false); }
  };

  const publicUrl = `${window.location.origin}/b/${tenant.slug}`;

  return (
    <div data-testid="settings-page">
      <PageHeader eyebrow="Setup" title="Workspace settings" description="Branding, contact info, and your public page." actions={
        <Button className="btn-tenant" onClick={save} disabled={saving} data-testid="settings-save-btn">{saving ? "Saving…" : "Save changes"}</Button>
      } />

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7 surface p-7 space-y-5">
          <div className="overline">Business</div>
          <div className="space-y-1.5"><Label>Business name</Label><Input value={tenant.name || ""} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} data-testid="settings-name-input" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={tenant.description || ""} onChange={(e) => setTenant({ ...tenant, description: e.target.value })} data-testid="settings-description-input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={tenant.contact_phone || ""} onChange={(e) => setTenant({ ...tenant, contact_phone: e.target.value })} data-testid="settings-phone-input" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={tenant.contact_email || ""} onChange={(e) => setTenant({ ...tenant, contact_email: e.target.value })} data-testid="settings-email-input" /></div>
          </div>
          <div className="space-y-1.5"><Label>Website</Label><Input value={tenant.website || ""} onChange={(e) => setTenant({ ...tenant, website: e.target.value })} placeholder="https://" data-testid="settings-website-input" /></div>
        </section>

        <aside className="col-span-12 lg:col-span-5 space-y-6">
          <div className="surface p-7">
            <div className="overline mb-3">Branding (face)</div>
            <div className="space-y-1.5">
              <Label>Primary color</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setBranding({ primary_color: c })} className={`h-9 w-9 rounded-lg border ${branding.primary_color === c ? "ring-2 ring-offset-2 ring-foreground" : "border-border"}`} style={{ background: c }} data-testid={`settings-color-${c.replace("#", "")}`} aria-label={c} />
                ))}
              </div>
              <Input className="mt-3" value={branding.primary_color || "#0A0A0A"} onChange={(e) => setBranding({ primary_color: e.target.value })} data-testid="settings-color-input" />
            </div>
            <div className="space-y-1.5 mt-5">
              <Label>Display name</Label>
              <Input value={branding.display_name || ""} onChange={(e) => setBranding({ display_name: e.target.value })} data-testid="settings-display-input" />
            </div>
            <div className="space-y-1.5 mt-5">
              <Label>Logo URL</Label>
              <Input value={branding.logo_url || ""} onChange={(e) => setBranding({ logo_url: e.target.value })} placeholder="https://" data-testid="settings-logo-input" />
            </div>
          </div>

          <div className="surface p-7">
            <div className="overline mb-3">Public page</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted rounded px-2 py-2 truncate">{publicUrl}</code>
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }} aria-label="Copy" data-testid="settings-copy-public"><Copy className="h-4 w-4" /></Button>
              <Link to={`/b/${tenant.slug}`} target="_blank"><Button variant="outline" size="icon" aria-label="Open" data-testid="settings-open-public"><ExternalLink className="h-4 w-4" /></Button></Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
