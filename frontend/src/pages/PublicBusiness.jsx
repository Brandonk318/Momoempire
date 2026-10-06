import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, errMessage } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Mail, Globe, Clock } from "lucide-react";

export default function PublicBusiness() {
  const { slug } = useParams();
  const [biz, setBiz] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/public/business/${slug}`).then((r) => setBiz(r.data)).catch((e) => setErr(errMessage(e)));
  }, [slug]);

  useEffect(() => {
    if (biz?.branding?.primary_color) {
      document.documentElement.style.setProperty("--tenant-primary", biz.branding.primary_color);
    }
  }, [biz?.branding?.primary_color]);

  if (err) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{err}</div>;
  if (!biz) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  const profile = biz.office_profile || {};

  return (
    <div className="min-h-screen bg-background" data-testid="public-business-page">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <Badge variant="outline" className="font-mono text-[11px]">Powered by AI Office</Badge>
        </div>
      </header>
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="overline mb-3">{profile.office_name || biz.industry_slug}</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">{biz.name}</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
          {profile.hero || biz.description || "Your business, available when customers need you."}
        </p>
        {profile.tagline && <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{profile.tagline}</p>}

        <div className="mt-8 flex flex-wrap gap-3">
          {biz.contact_phone && (
            <Button className="btn-tenant h-11" asChild><a href={`tel:${biz.contact_phone}`} data-testid="public-call-btn"><Phone className="h-4 w-4 mr-2" />{profile.cta || "Call us"}</a></Button>
          )}
          {biz.contact_email && (
            <Button variant="outline" className="h-11" asChild><a href={`mailto:${biz.contact_email}`}><Mail className="h-4 w-4 mr-2" />Email</a></Button>
          )}
          {biz.website && (
            <Button variant="outline" className="h-11" asChild><a href={biz.website} target="_blank" rel="noreferrer"><Globe className="h-4 w-4 mr-2" />Website</a></Button>
          )}
        </div>

        {(profile.value_props || []).length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mt-12" data-testid="niche-value-props">
            {profile.value_props.map((item) => (
              <div key={item} className="surface p-5 text-sm font-medium">{item}</div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5 mt-16">
          <div className="surface p-6">
            <div className="overline mb-2">AI Receptionist</div>
            <div className="font-display text-2xl">{biz.ai_employee?.name || "Alex"}</div>
            <p className="text-sm text-muted-foreground mt-2">"{biz.ai_employee?.greeting || "Hi! How can I help you today?"}"</p>
          </div>
          <div className="surface p-6">
            <div className="overline mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Hours</div>
            <ul className="text-sm space-y-1">
              {biz.hours && Object.entries(biz.hours).map(([d, h]) => (
                <li key={d} className="flex justify-between"><span className="capitalize text-muted-foreground">{d}</span><span>{h}</span></li>
              ))}
            </ul>
          </div>
          <div className="surface p-6">
            <div className="overline mb-2">Service area</div>
            <div className="flex flex-wrap gap-1.5">
              {(biz.service_areas || []).map((a) => (
                <Badge key={a} variant="secondary">{a}</Badge>
              ))}
              {(!biz.service_areas || biz.service_areas.length === 0) && (
                <span className="text-sm text-muted-foreground">No service areas listed.</span>
              )}
            </div>
          </div>
        </div>

        {(biz.faqs || []).length > 0 && (
          <div className="mt-16">
            <div className="overline mb-3">FAQ</div>
            <h2 className="font-display text-3xl">Frequently asked</h2>
            <div className="mt-6 grid md:grid-cols-2 gap-5">
              {biz.faqs.map((f, i) => (
                <div key={i} className="surface p-6">
                  <div className="font-medium">{f.question}</div>
                  <p className="text-sm text-muted-foreground mt-2">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
