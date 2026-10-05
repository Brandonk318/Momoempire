import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMessage } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pwd });
      toast.success("Password updated. Please log in.");
      nav("/login", { replace: true });
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="font-display text-3xl mt-8 tracking-tight">Choose a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4" data-testid="reset-form">
          <div className="space-y-1.5">
            <Label htmlFor="pwd">New password</Label>
            <Input id="pwd" type="password" minLength={8} required value={pwd} onChange={(e) => setPwd(e.target.value)} data-testid="reset-password-input" />
          </div>
          <Button type="submit" className="w-full h-11 btn-tenant" disabled={loading || !token} data-testid="reset-submit-btn">
            {loading ? "Updating…" : "Update password"}
          </Button>
          {!token && <p className="text-xs text-destructive">Missing or invalid token.</p>}
        </form>
        <p className="text-[13px] text-muted-foreground mt-4">
          <Link to="/login" className="text-foreground font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
