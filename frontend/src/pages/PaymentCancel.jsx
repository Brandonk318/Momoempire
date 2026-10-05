import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md text-center" data-testid="payment-cancel-page">
        <Logo />
        <XCircle className="h-14 w-14 mx-auto text-amber-500 mt-10" />
        <h1 className="font-display text-3xl mt-6 tracking-tight">Checkout canceled</h1>
        <p className="text-sm text-muted-foreground mt-2">No charge was made.</p>
        <Link to="/app/billing" className="mt-10 block"><Button className="btn-tenant w-full h-11">Return to billing</Button></Link>
      </div>
    </div>
  );
}
