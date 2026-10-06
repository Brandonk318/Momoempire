import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, errMessage } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight } from "lucide-react";

export default function ReferralLanding() {
  const { code } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    api.post(`/public/r/${code}/visit`).then((r) => setInfo(r.data)).catch((e) => setErr(errMessage(e)));
  }, [code]);

  const goToBusiness = async () => {
    try { await api.post(`/public/r/${code}/convert`); } catch { /* non-blocking */ }
    if (info?.business?.slug) nav(`/b/${info.business.slug}?ref=${code}`);
  };

  if (err) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{err}</div>;
  if (!info) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  const biz = info.business || {};
  const primary = biz.branding?.primary_color || "#0A0A0A";

  return (
    <div className="min-h-screen grid place-items-center p-6" data-testid="referral-landing">
      <div className="max-w-md w-full text-center">
        <Logo />
        <div className="mt-8 h-14 w-14 rounded-2xl mx-auto grid place-items-center text-white" style={{ background: primary }}>
          <Gift className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl mt-6">You've been referred by {info.referrer}</h1>
        <p className="text-muted-foreground mt-2">to <strong>{biz.name || "a trusted local business"}</strong>. Say hi — they'll know you came from this link.</p>
        <Button onClick={goToBusiness} className="mt-8 h-12 px-6" style={{ background: primary, color: "white" }} data-testid="referral-continue-btn">
          Continue to {biz.name || "the business"}<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <p className="text-[11px] text-muted-foreground mt-4 font-mono">code · {code}</p>
      </div>
    </div>
  );
}
