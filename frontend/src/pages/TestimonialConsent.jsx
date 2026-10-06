import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Logo } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Public consent / preview page for 5-star testimonial sharing.
 * Reached via emailed /t/consent/:token link or SMS. No auth required.
 */
export default function TestimonialConsent() {
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [edited, setEdited] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public/testimonials/consent/${token}`);
        setState({ loading: false, data });
        setEdited(data.polished_text || "");
        if (data.lang && data.lang !== i18n.language) {
          i18n.changeLanguage(data.lang).catch(() => {});
        }
      } catch (e) {
        setState({ loading: false, error: errMessage(e) });
      }
    })();
    // eslint-disable-next-line
  }, [token]);

  async function decide(decision) {
    try {
      await api.post(`/public/testimonials/consent/${token}`, {
        decision,
        edited_text: decision === "approve" ? edited : undefined,
      });
      setDone(decision);
    } catch (e) { toast.error(errMessage(e)); }
  }

  if (state.loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (state.error) return <div className="min-h-screen flex items-center justify-center text-sm text-red-700">{state.error}</div>;

  const d = state.data;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10" data-testid="testi-consent-page">
        <h1 className="text-3xl font-display tracking-tight">{t("testimonials.consent_title")}</h1>
        <p className="text-muted-foreground mt-2">{t("testimonials.consent_sub", { business: d.business })}</p>

        <div className="flex gap-0.5 mt-4">
          {Array.from({ length: d.rating || 5 }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
          ))}
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("testimonials.original")}</div>
              <p className="text-sm mt-1 text-muted-foreground">{d.original_text}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("testimonials.polished")}</div>
              <Textarea
                data-testid="testi-consent-edited"
                rows={4}
                value={edited}
                onChange={(e) => setEdited(e.target.value.slice(0, 400))}
                disabled={!!done}
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">{edited.length}/400</div>
            </div>

            {done ? (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 text-sm" data-testid="testi-consent-done">
                {done === "approve" ? t("testimonials.consent_thanks") : t("testimonials.consent_declined")}
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => decide("approve")} data-testid="testi-consent-approve">
                  {t("testimonials.consent_approve")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => decide("reject")} data-testid="testi-consent-reject">
                  {t("testimonials.consent_reject")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
