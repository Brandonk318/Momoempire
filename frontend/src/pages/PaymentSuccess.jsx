import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const [status, setStatus] = useState("pending");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (cancelled) return;
        setStatus(data.payment_status);
        if (data.payment_status !== "paid" && attempts < 10) {
          setTimeout(() => setAttempts((a) => a + 1), 2000);
        }
      } catch (e) {
        setStatus("error");
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, attempts]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <Logo />
        <div className="mt-10">
          {status === "paid" && <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />}
          {status === "pending" && <Loader2 className="h-14 w-14 mx-auto animate-spin text-muted-foreground" />}
          {(status === "error" || status === "failed") && <XCircle className="h-14 w-14 mx-auto text-rose-500" />}
          <h1 className="font-display text-3xl mt-6 tracking-tight">
            {status === "paid" ? "Subscription active" : status === "pending" ? "Confirming payment…" : "Payment issue"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2" data-testid="payment-status-text">Status: {status}</p>
        </div>
        <Link to="/app" className="mt-10 block"><Button className="btn-tenant w-full h-11" data-testid="payment-back-btn">Back to dashboard</Button></Link>
      </div>
    </div>
  );
}
