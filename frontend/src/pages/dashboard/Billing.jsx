import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    api.get("/payments/plans").then((r) => setPlans(r.data));
    api.get("/tenants/me").then((r) => setTenant(r.data));
  }, []);

  const subscribe = async (planId) => {
    setLoading(planId);
    try {
      const { data } = await api.post("/payments/checkout", { plan_id: planId, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(errMessage(e));
      setLoading("");
    }
  };

  return (
    <div data-testid="billing-page">
      <PageHeader eyebrow="Setup" title="Billing & plans" description="Launch free. Upgrade when you're ready." />
      <div className="surface p-6 mb-6 flex items-center justify-between">
        <div>
          <div className="overline">Current plan</div>
          <div className="font-display text-2xl mt-1">{tenant?.subscription_status === "active" ? "Active" : "Trial"}</div>
          <div className="text-xs text-muted-foreground mt-1">{user?.email}</div>
        </div>
        <Badge variant={tenant?.subscription_status === "active" ? "default" : "secondary"} data-testid="billing-current-badge">{tenant?.subscription_status || "trial"}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div key={p.id} className="surface p-7 lift" data-testid={`plan-card-${p.id}`}>
            <div className="overline">{p.name}</div>
            <div className="font-display text-4xl mt-3 tracking-tight">${(p.amount / 100).toFixed(0)}<span className="text-base text-muted-foreground font-sans">/mo</span></div>
            <ul className="mt-5 text-sm space-y-2 text-muted-foreground">
              <li>· 1 location, {p.id === "scale" ? "unlimited" : p.id === "growth" ? "10" : "5"} users</li>
              <li>· AI Employee + Business Advisor</li>
              <li>· {p.id === "starter" ? "500" : p.id === "growth" ? "2,500" : "10,000"} AI minutes / mo</li>
              <li>· Priority support ({p.id === "scale" ? "24/7" : p.id === "growth" ? "business hours" : "email"})</li>
            </ul>
            <Button className="btn-tenant w-full mt-6" onClick={() => subscribe(p.id)} disabled={loading === p.id} data-testid={`plan-subscribe-${p.id}`}>
              {loading === p.id ? "Redirecting…" : "Subscribe"}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 surface p-6 text-sm">
        <div className="overline mb-2">Tax</div>
        <p className="text-muted-foreground">Stripe calculates tax on checkout (+0.5% per transaction). You handle filing & remittance. You can switch to a fully-managed plan later from Settings.</p>
      </div>
    </div>
  );
}
