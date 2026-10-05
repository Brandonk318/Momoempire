import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const Stat = ({ label, value }) => (
  <div className="surface p-6">
    <div className="overline">{label}</div>
    <div className="font-display text-4xl mt-2 tracking-tight">{value ?? "—"}</div>
  </div>
);

export default function Analytics() {
  const [sum, setSum] = useState({});
  useEffect(() => {
    api.get("/tenants/summary").then((r) => setSum(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="analytics-page">
      <PageHeader eyebrow="Intelligence" title="Analytics" description="A live snapshot of your digital office." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Leads total" value={sum.leads} />
        <Stat label="New leads" value={sum.leads_new} />
        <Stat label="Customers" value={sum.customers} />
        <Stat label="Appointments" value={sum.appointments} />
        <Stat label="Upcoming" value={sum.upcoming_appointments} />
        <Stat label="Services" value={sum.services} />
        <Stat label="Knowledge" value={sum.knowledge_entries} />
      </div>
      <div className="mt-8 surface p-8 text-sm text-muted-foreground">
        Deeper trend charts (calls, revenue, response time) arrive in Phase 2 once telephony + payments are enabled.
      </div>
    </div>
  );
}
