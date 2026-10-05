import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMessage } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("If that email exists, we sent a reset link.");
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
        <h1 className="font-display text-3xl mt-8 tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground text-sm mt-1">We'll email you a secure reset link.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" data-testid="forgot-form">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email-input" />
          </div>
          <Button type="submit" className="w-full h-11 btn-tenant" disabled={loading || sent} data-testid="forgot-submit-btn">
            {sent ? "Check your inbox" : loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="text-[13px] text-muted-foreground mt-4">
          <Link to="/login" className="text-foreground font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
