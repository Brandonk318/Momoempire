import { useEffect, useState } from "react";
import { api, errMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Automations() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/tenants/automations").then((r) => setS(r.data)); }, []);
  if (!s) return null;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/tenants/automations", {
        appointment_reminders: s.appointment_reminders,
        reminder_hours_before: Number(s.reminder_hours_before),
        review_request_after_job: s.review_request_after_job,
        missed_call_textback: s.missed_call_textback,
        missed_call_textback_message: s.missed_call_textback_message,
        follow_up_leads_hours: Number(s.follow_up_leads_hours),
        reminder_sms_template: s.reminder_sms_template,
      });
      setS(data);
      toast.success("Automations saved");
    } catch (e) { toast.error(errMessage(e)); }
    finally { setSaving(false); }
  };

  const Toggle = ({ label, help, k, testId }) => (
    <div className="flex items-start justify-between gap-6 py-4" data-testid={testId}>
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{help}</div>
      </div>
      <Switch checked={!!s[k]} onCheckedChange={(v) => setS({ ...s, [k]: v })} data-testid={`${testId}-switch`} />
    </div>
  );

  return (
    <div data-testid="automations-page">
      <PageHeader eyebrow="Setup" title="Automations" description="Flip on the loops that run your office in the background." actions={
        <Button className="btn-tenant" onClick={save} disabled={saving} data-testid="automations-save-btn">{saving ? "Saving…" : "Save"}</Button>
      } />
      <div className="surface p-6 divide-y divide-border max-w-3xl">
        <Toggle label="Appointment reminders" help="SMS your customer before their appointment." k="appointment_reminders" testId="auto-reminders" />
        <div className="pt-4 pb-2 flex items-center gap-4" data-testid="auto-reminder-hours">
          <Label className="w-56">Hours before appointment</Label>
          <Input type="number" value={s.reminder_hours_before} onChange={(e) => setS({ ...s, reminder_hours_before: e.target.value })} className="max-w-[120px]" />
        </div>
        <div className="pt-2 pb-4" data-testid="auto-reminder-template">
          <Label>Reminder SMS template</Label>
          <Textarea rows={2} className="mt-1.5" value={s.reminder_sms_template} onChange={(e) => setS({ ...s, reminder_sms_template: e.target.value })} />
          <p className="text-[11px] text-muted-foreground mt-1">Variables: {"{name}"}, {"{service}"}, {"{time}"}</p>
        </div>
        <Toggle label="Review request after job" help="Auto-send a review link after an appointment is completed." k="review_request_after_job" testId="auto-reviews" />
        <Toggle label="Missed-call text back" help="When a call is missed, SMS the caller instantly so they don't bounce to a competitor." k="missed_call_textback" testId="auto-mctb" />
        <div className="pt-2 pb-4" data-testid="auto-mctb-template">
          <Label>Missed-call text</Label>
          <Textarea rows={2} className="mt-1.5" value={s.missed_call_textback_message} onChange={(e) => setS({ ...s, missed_call_textback_message: e.target.value })} />
        </div>
        <div className="pt-4 flex items-center gap-4" data-testid="auto-lead-followup">
          <Label className="w-56">Follow-up new leads after</Label>
          <Input type="number" value={s.follow_up_leads_hours} onChange={(e) => setS({ ...s, follow_up_leads_hours: e.target.value })} className="max-w-[120px]" />
          <span className="text-sm text-muted-foreground">hours</span>
        </div>
      </div>
    </div>
  );
}
