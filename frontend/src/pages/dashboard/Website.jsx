import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Copy, Plug, RefreshCcw, Trash2 } from "lucide-react";

export default function Website() {
  const [tenant, setTenant] = useState(null);
  const [domains, setDomains] = useState([]);
  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => {
    api.get("/tenants/me").then((r) => setTenant(r.data));
    api.get("/tenants/domains").then((r) => setDomains(r.data));
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    setAdding(true);
    try { await api.post("/tenants/domains", { domain }); setDomain(""); load(); toast.success("Domain added. Create the CNAME, then verify."); }
    catch (e) { toast.error(errMessage(e)); }
    finally { setAdding(false); }
  };
  const verify = async (d) => { try { const { data } = await api.post(`/tenants/domains/${d.id}/verify`); if (data.status === "verified") toast.success("Domain verified!"); else toast.error(data.detail || "Not yet — give DNS a few minutes"); load(); } catch (e) { toast.error(errMessage(e)); } };
  const del = async (d) => { if (!confirm("Remove domain?")) return; try { await api.delete(`/tenants/domains/${d.id}`); load(); } catch (e) { toast.error(errMessage(e)); } };

  if (!tenant) return null;
  const publicUrl = `${window.location.origin}/b/${tenant.slug}`;

  return (
    <div data-testid="website-page">
      <PageHeader eyebrow="Business" title="Website" description="A branded page for your business. Connect a domain when you're ready." />

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7 surface p-6">
          <div className="overline mb-3">Preview</div>
          <div className="rounded-xl border border-border overflow-hidden">
            <iframe title="site-preview" src={`/b/${tenant.slug}`} className="w-full h-[520px] bg-white" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Input value={publicUrl} readOnly className="font-mono text-xs" data-testid="site-url-input" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }} data-testid="site-copy-btn"><Copy className="h-4 w-4" /></Button>
            <Link to={`/b/${tenant.slug}`} target="_blank"><Button variant="outline" size="icon" data-testid="site-open-btn"><ExternalLink className="h-4 w-4" /></Button></Link>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-5 space-y-5">
          <div className="surface p-6">
            <div className="overline mb-3">Custom domain</div>
            <div className="flex gap-2">
              <Input placeholder="www.yourbusiness.com" value={domain} onChange={(e) => setDomain(e.target.value)} data-testid="domain-input" />
              <Button className="btn-tenant" onClick={add} disabled={!domain || adding} data-testid="domain-add-btn"><Plug className="h-4 w-4 mr-1" />Add</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">After adding, create a CNAME at your DNS host pointing to the target shown below, then click Verify.</p>
          </div>

          <div className="surface p-6">
            <div className="overline mb-3">Your domains</div>
            {domains.length === 0 ? <div className="text-sm text-muted-foreground">No custom domains yet.</div> : (
              <ul className="space-y-3">
                {domains.map((d) => (
                  <li key={d.id} className="rounded-lg border border-border p-3" data-testid={`domain-row-${d.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm truncate">{d.domain}</div>
                      <Badge className={d.status === "verified" ? "bg-emerald-100 text-emerald-900" : d.status === "failed" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}>{d.status}</Badge>
                    </div>
                    <div className="mt-2 text-[11px] font-mono text-muted-foreground">CNAME → {d.cname_target}</div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => verify(d)} data-testid={`domain-verify-${d.id}`}><RefreshCcw className="h-3 w-3 mr-1" />Verify</Button>
                      <Button variant="ghost" size="sm" onClick={() => del(d)} data-testid={`domain-delete-${d.id}`}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="surface p-6">
            <div className="overline mb-3">Embed widget</div>
            <p className="text-xs text-muted-foreground mb-3">Paste this one-liner on any website — it adds a floating "Talk to {tenant.name}" chat/lead-capture button in your brand color.</p>
            <code className="block text-[11px] bg-muted rounded p-3 font-mono break-all" data-testid="embed-snippet">{`<script src="${window.location.origin}/api/public/widget/${tenant.slug}.js" defer></script>`}</code>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { navigator.clipboard.writeText(`<script src="${window.location.origin}/api/public/widget/${tenant.slug}.js" defer></script>`); toast.success("Snippet copied"); }} data-testid="embed-copy-btn"><Copy className="h-3 w-3 mr-1" />Copy snippet</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
