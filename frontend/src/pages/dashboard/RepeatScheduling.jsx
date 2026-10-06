import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Send, Trash2 } from "lucide-react";

const CADENCES = ["annual", "semi_annual", "quarterly", "custom"];

export default function RepeatScheduling() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [defaults, setDefaults] = useState({ default_cadence: "annual" });
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    service_name: "", cadence: "annual", interval_months: 12,
    start_date: new Date().toISOString().slice(0, 10),
    reminder_days_before: 14, notes: "",
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const [r1, r2] = await Promise.all([
        api.get("/repeat/schedules"),
        api.get("/repeat/defaults"),
      ]);
      setRows(r1.data || []);
      setDefaults(r2.data || {});
      if (r2.data?.default_cadence) {
        setForm((f) => ({ ...f, cadence: r2.data.default_cadence }));
      }
    } catch (e) { toast.error(errMessage(e)); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.customer_name || !form.service_name) {
      toast.error("Customer name and service are required");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.cadence !== "custom") delete payload.interval_months;
      await api.post("/repeat/schedules", payload);
      toast.success(t("repeat.created_toast"));
      setForm((f) => ({ ...f, customer_name: "", customer_email: "", customer_phone: "", service_name: "", notes: "" }));
      load();
    } catch (e) { toast.error(errMessage(e)); }
    setLoading(false);
  }

  async function remove(id) {
    try {
      await api.delete(`/repeat/schedules/${id}`);
      toast.success(t("repeat.deleted_toast"));
      load();
    } catch (e) { toast.error(errMessage(e)); }
  }

  async function sendNow(id) {
    try {
      await api.post(`/repeat/schedules/${id}/send-reminder`);
      toast.success(t("repeat.sent_toast"));
      load();
    } catch (e) { toast.error(errMessage(e)); }
  }

  async function patchStatus(id, status) {
    try {
      await api.patch(`/repeat/schedules/${id}`, { status });
      toast.success(t("repeat.updated_toast"));
      load();
    } catch (e) { toast.error(errMessage(e)); }
  }

  return (
    <div className="space-y-6" data-testid="repeat-page">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2">
          <CalendarClock className="h-7 w-7" /> {t("repeat.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("repeat.sub")}</p>
        {defaults.default_cadence && (
          <p className="text-[12px] mt-1 text-muted-foreground">
            {t("repeat.default_suggestion", { cadence: t(`repeat.cadence_${defaults.default_cadence}`) })}
          </p>
        )}
      </div>

      <Card data-testid="repeat-new-card">
        <CardHeader><CardTitle className="text-base">{t("repeat.new")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>{t("repeat.customer_name")}</Label>
            <Input data-testid="repeat-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div>
            <Label>{t("repeat.email")}</Label>
            <Input data-testid="repeat-email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
          </div>
          <div>
            <Label>{t("repeat.phone")}</Label>
            <Input data-testid="repeat-phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          </div>
          <div>
            <Label>{t("repeat.service")}</Label>
            <Input data-testid="repeat-service" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
          </div>
          <div>
            <Label>{t("repeat.cadence")}</Label>
            <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v })}>
              <SelectTrigger data-testid="repeat-cadence"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => <SelectItem key={c} value={c}>{t(`repeat.cadence_${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.cadence === "custom" && (
            <div>
              <Label>{t("repeat.interval_months")}</Label>
              <Input data-testid="repeat-interval" type="number" min="1" max="60" value={form.interval_months || 12}
                     onChange={(e) => setForm({ ...form, interval_months: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <Label>{t("repeat.start_date")}</Label>
            <Input data-testid="repeat-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label>{t("repeat.reminder_days_before")}</Label>
            <Input data-testid="repeat-days-before" type="number" min="1" max="90" value={form.reminder_days_before}
                   onChange={(e) => setForm({ ...form, reminder_days_before: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-3">
            <Label>{t("repeat.notes")}</Label>
            <Textarea data-testid="repeat-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={create} disabled={loading} data-testid="repeat-create-btn">
              {t("common.create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("nav.repeat")}</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center" data-testid="repeat-empty">{t("repeat.empty")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="repeat-table">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">{t("repeat.customer_name")}</th>
                    <th className="py-2 pr-4">{t("repeat.service")}</th>
                    <th className="py-2 pr-4">{t("repeat.cadence")}</th>
                    <th className="py-2 pr-4">{t("repeat.next_due")}</th>
                    <th className="py-2 pr-4">{t("repeat.last_reminded")}</th>
                    <th className="py-2 pr-4">{t("common.status")}</th>
                    <th className="py-2 pr-4 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/40" data-testid={`repeat-row-${r.id}`}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.customer_email || r.customer_phone || "—"}</div>
                      </td>
                      <td className="py-2 pr-4">{r.service_name}</td>
                      <td className="py-2 pr-4">{t(`repeat.cadence_${r.cadence}`)}{r.cadence === "custom" ? ` (${r.interval_months}m)` : ""}</td>
                      <td className="py-2 pr-4">{(r.next_due_at || "").slice(0, 10)}</td>
                      <td className="py-2 pr-4">{(r.last_reminded_at || "—").slice(0, 10)}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-[11px] px-2 py-1 rounded ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : r.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-700"}`}>{r.status}</span>
                      </td>
                      <td className="py-2 pr-4 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => sendNow(r.id)} data-testid={`repeat-send-${r.id}`}>
                          <Send className="h-3 w-3 mr-1" /> {t("repeat.send_now")}
                        </Button>
                        {r.status === "active" ? (
                          <Button variant="ghost" size="sm" onClick={() => patchStatus(r.id, "paused")} data-testid={`repeat-pause-${r.id}`}>{t("common.pause")}</Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => patchStatus(r.id, "active")} data-testid={`repeat-resume-${r.id}`}>{t("common.resume")}</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => remove(r.id)} data-testid={`repeat-delete-${r.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
