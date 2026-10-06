import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

export default function CustomerPortal() {
  const [tenant, setTenant] = useState(null);
  useEffect(() => { api.get("/tenants/me").then((r) => setTenant(r.data)); }, []);
  if (!tenant) return null;
  const url = `${window.location.origin}/portal/${tenant.slug}`;
  return (
    <div data-testid="customer-portal-page">
      <PageHeader eyebrow="Business" title="Customer Portal" description="A white-labeled self-serve portal for your customers." />
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7 surface p-6">
          <div className="overline mb-3">Preview</div>
          <div className="rounded-xl border border-border overflow-hidden">
            <iframe title="portal-preview" src={`/portal/${tenant.slug}`} className="w-full h-[560px] bg-white" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Input value={url} readOnly className="font-mono text-xs" data-testid="portal-url-input" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }} data-testid="portal-copy-btn"><Copy className="h-4 w-4" /></Button>
            <Link to={`/portal/${tenant.slug}`} target="_blank"><Button variant="outline" size="icon" data-testid="portal-open-btn"><ExternalLink className="h-4 w-4" /></Button></Link>
          </div>
        </section>
        <aside className="col-span-12 lg:col-span-5 surface p-6">
          <div className="overline mb-3">What customers can do</div>
          <ul className="text-sm space-y-3">
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block" />View your branded page</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block" />Submit a service request</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block" />Book an appointment</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block" />See services, hours, FAQs</li>
            <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block" />Returning customers: magic-link login for appointments, estimates, invoices</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-5">Branding (color, display name, logo) is pulled from Settings. Changes apply instantly.</p>
        </aside>
      </div>
    </div>
  );
}
