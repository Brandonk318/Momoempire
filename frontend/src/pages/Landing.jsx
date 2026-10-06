import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Bot, PhoneCall, CalendarClock, MessageSquare,
  Globe, ShieldCheck, Workflow, Star, Sparkles, Factory,
} from "lucide-react";

const INDUSTRIES = [
  { name: "HVAC", icon: "🔥" },
  { name: "Plumbing", icon: "💧" },
  { name: "Electrical", icon: "⚡" },
  { name: "Roofing", icon: "🏠" },
  { name: "Dental", icon: "🦷" },
  { name: "Physical Therapy", icon: "🏃" },
  { name: "Landscaping", icon: "🌿" },
  { name: "Pest Control", icon: "🪲" },
  { name: "Contractor", icon: "🔨" },
  { name: "Independent", icon: "💼" },
];

export default function Landing() {
  return (
    <div className="marketing-shell relative overflow-x-hidden" data-testid="landing-page">
      <div className="marketing-noise fixed inset-0 opacity-50" aria-hidden />
      {/* Nav */}
      <header className="sticky top-0 z-30 glass-crystal border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo variant="light" />
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-white/70">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#industries" className="hover:text-white">Industries</a>
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" className="text-white hover:bg-white/10" data-testid="landing-login-btn">Log in</Button></Link>
            <Link to="/signup"><Button className="bg-white text-black hover:bg-white/90" data-testid="landing-signup-btn">Get started<ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero bento */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-28">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-8">
            <Badge className="bg-white/10 text-white/80 border border-white/15 mb-5 hover:bg-white/10">
              <Sparkles className="h-3 w-3 mr-1.5" /> Phase 1 · AI Office Platform
            </Badge>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-white">
              We build you an{" "}
              <span className="italic text-white/90">AI employee</span><br />
              and a digital office.
            </h1>
            <p className="mt-6 text-white/70 text-lg max-w-xl">
              A done-for-you workspace that answers calls, books jobs, and runs
              operations for small businesses — in every industry. Hardware elite,
              face swappable.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-6" data-testid="hero-start-btn">
                  Start your AI Office <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <a href="#industries" className="text-white/70 hover:text-white text-[13px] inline-flex items-center gap-1.5">
                See industries we power <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <aside className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="glass-crystal rounded-2xl p-5">
              <div className="overline text-white/50">Live demo</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-emerald-400 grid place-items-center text-black"><PhoneCall className="h-4 w-4" /></div>
                <div className="text-sm text-white">Call answered</div>
              </div>
              <div className="mt-3 text-[12px] text-white/60">Alex (AI) · 0:14</div>
              <div className="mt-2 text-[13px] text-white">"We can send a tech between 2-4pm today."</div>
            </div>
            <div className="glass-crystal rounded-2xl p-5">
              <div className="overline text-white/50">Booked</div>
              <div className="font-display text-3xl text-white mt-2">24</div>
              <div className="text-[12px] text-white/60">appointments this week</div>
            </div>
            <div className="glass-crystal rounded-2xl p-5 col-span-2">
              <div className="overline text-white/50">AI Employee</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400 grid place-items-center text-white"><Bot className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm text-white">Alex · HVAC</div>
                  <div className="text-[12px] text-white/60">Warm · Direct · Books fast</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-16 flex items-center gap-6 text-[12px] text-white/40 font-mono">
          <span>⌁ Multi-tenant</span>
          <span>⌁ API-first</span>
          <span>⌁ SOC-ready</span>
          <span>⌁ Stripe-powered</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20">
        <div className="overline text-white/50 mb-3">How it works</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight text-white max-w-2xl">
          From sign-up to a staffed office in minutes.
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Tell us about your business", d: "A short, plain-English wizard. Industry, hours, services, and the way you talk to customers.", icon: Workflow },
            { n: "02", t: "We assemble your AI Office", d: "Industry templates seed your AI employee, FAQs, intake, escalation, and services — tailored to your trade.", icon: Bot },
            { n: "03", t: "Go live, keep swapping the face", d: "Change your brand, voice, and visuals anytime. The core engine stays rock-solid underneath.", icon: Sparkles },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="glass-crystal rounded-2xl p-6 lift">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-xs text-white/50">{s.n}</span>
                  <Icon className="h-5 w-5 text-white/70" />
                </div>
                <h3 className="font-display text-xl text-white mb-2">{s.t}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature bento */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 md:col-span-7 glass-crystal rounded-2xl p-8 lift">
            <div className="overline text-white/50 mb-3">A full digital office</div>
            <h3 className="font-display text-3xl text-white">Twenty workspaces. One console.</h3>
            <p className="text-white/60 mt-3 max-w-lg">Calls, messages, leads, customers, appointments, services, payments, website, portal, reviews, analytics, advisor, knowledge, automations, integrations, numbers, usage, billing, settings — all under one calm, non-technical interface.</p>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[PhoneCall, MessageSquare, CalendarClock, Globe, Star, Workflow, ShieldCheck, Bot].map((Ic, i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10 grid place-items-center">
                  <Ic className="h-5 w-5 text-white/70" />
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 glass-crystal rounded-2xl p-8 lift">
            <div className="overline text-white/50 mb-3">Swappable face</div>
            <h3 className="font-display text-3xl text-white">Your brand, instantly applied.</h3>
            <p className="text-white/60 mt-3">A CSS-variable brand system means tenants swap colors, logo, and voice in seconds — the underlying hardware never changes.</p>
            <div className="mt-6 flex gap-2 flex-wrap">
              {["#0A0A0A","#2563EB","#059669","#DC2626","#7C3AED","#D97706"].map((c) => (
                <div key={c} className="h-10 w-10 rounded-lg border border-white/10" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="overline text-white/50 mb-3">Industries we power</div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight text-white">One engine. Every trade.</h2>
          </div>
          <p className="max-w-md text-white/60">Admins add future industries without rebuilding. Templates ship with AI personality, services, FAQs, escalations and more.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="landing-industries">
          {INDUSTRIES.map((ind) => (
            <div key={ind.name} className="glass-crystal rounded-xl p-5 lift">
              <div className="text-2xl">{ind.icon}</div>
              <div className="text-white mt-3 font-medium">{ind.name}</div>
              <div className="text-[11px] text-white/40 mt-1 font-mono">Template ready</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing hint */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="glass-crystal rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <Factory className="h-72 w-72 absolute -right-10 -bottom-10 text-white/5" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl text-white tracking-tight max-w-2xl">
              Launch today, pay when you're ready.
            </h2>
            <p className="text-white/60 mt-4 max-w-xl">Start free. Plug Stripe into your account in two clicks when you're ready to turn on payments. We handle the country rules so you don't have to.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/signup"><Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-6" data-testid="pricing-start-btn">Create account</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline" className="h-12 px-6 bg-transparent text-white border-white/20 hover:bg-white/10" data-testid="pricing-login-btn">I already have one</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4 text-[12px] text-white/40">
          <Logo variant="light" />
          <div>© {new Date().getFullYear()} AI Office Platform · Hardware elite, face swappable</div>
        </div>
      </footer>
    </div>
  );
}
