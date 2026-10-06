import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, errMessage } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function InviteAccept() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!token) { setErr("Missing invite token"); return; }
    api.get(`/public/invitations/${token}`).then((r) => setPreview(r.data)).catch((e) => setErr(errMessage(e)));
  }, [token]);

  const accept = async () => {
    setLoading(true);
    try {
      await api.post("/public/invitations/accept", { token, name: form.name, password: form.password });
      toast.success("Welcome aboard!");
      nav("/app", { replace: true });
    } catch (e) { toast.error(errMessage(e)); }
    finally { setLoading(false); }
  };

  if (err) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{err}</div>;
  if (!preview) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen grid place-items-center p-6" data-testid="invite-accept-page">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="font-display text-3xl mt-8 tracking-tight">Join {preview.tenant_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">You've been invited as {preview.invitation.role}. Set up your account:</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label>Email</Label><Input value={preview.invitation.email} disabled /></div>
          <div className="space-y-1.5"><Label>Your name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="invite-name-input" /></div>
          <div className="space-y-1.5"><Label>Password</Label><Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="invite-password-input" /></div>
          <Button className="w-full h-11 btn-tenant" onClick={accept} disabled={loading || !form.name || form.password.length < 8} data-testid="invite-accept-btn">
            {loading ? "Joining…" : "Join the team"}
          </Button>
        </div>
      </div>
    </div>
  );
}
