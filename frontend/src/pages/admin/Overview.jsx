import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const Stat = ({ label, value }) => (
  <div className="surface p-6">
    <div className="overline">{label}</div>
    <div className="font-display text-4xl mt-2 tracking-tight">{value ?? "—"}</div>
  </div>
);

export default function AdminOverview() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/admin/overview").then((r) => setS(r.data)); }, []);
  return (
    <div data-testid="admin-overview-page">
      <PageHeader eyebrow="Platform" title="Overview" description="Health and scale of the AI Office platform." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Tenants" value={s.tenants} />
        <Stat label="Active" value={s.active_tenants} />
        <Stat label="Onboarded" value={s.onboarded} />
        <Stat label="Users" value={s.users} />
        <Stat label="Industries" value={s.industries} />
        <Stat label="Countries enabled" value={s.countries_enabled} />
        <Stat label="Flags" value={s.feature_flags} />
        <Stat label="Appointments total" value={s.appointments_total} />
      </div>
    </div>
  );
}
