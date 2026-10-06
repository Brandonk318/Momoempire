import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, errMessage } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, CheckCircle2 } from "lucide-react";

export default function ReviewPublic() {
  const { token } = useParams();
  const [state, setState] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { api.get(`/public/reviews/${token}`).then((r) => setState(r.data)).catch((e) => toast.error(errMessage(e))); }, [token]);
  if (!state) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  const submit = async () => {
    if (rating < 1) return toast.error("Pick a rating");
    try { await api.post(`/public/reviews/${token}`, { rating, comment }); setDone(true); }
    catch (e) { toast.error(errMessage(e)); }
  };

  const name = state.tenant?.branding?.display_name || state.tenant?.name;

  return (
    <div className="min-h-screen grid place-items-center p-6" data-testid="review-public-page">
      <div className="w-full max-w-md text-center">
        <Logo />
        {done ? (
          <>
            <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 mt-10" />
            <h1 className="font-display text-3xl mt-6 tracking-tight">Thanks for your review!</h1>
            <p className="text-sm text-muted-foreground mt-2">{name} appreciates it.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl mt-10 tracking-tight">How did we do?</h1>
            <p className="text-sm text-muted-foreground mt-1">A quick review helps {name} enormously.</p>
            <div className="mt-8 flex justify-center gap-2" data-testid="review-stars">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`}>
                  <Star className={`h-10 w-10 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea className="mt-6 text-left" rows={4} placeholder="Tell them what you loved (optional)" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="review-comment-input" />
            <Button className="btn-tenant w-full h-11 mt-6" onClick={submit} disabled={!rating} data-testid="review-submit-btn">Submit review</Button>
          </>
        )}
      </div>
    </div>
  );
}
