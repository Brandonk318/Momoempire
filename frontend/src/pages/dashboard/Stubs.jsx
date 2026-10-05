import StubPage from "@/components/StubPage";

export function Calls() {
  return <StubPage testId="stub-calls" eyebrow="Communications" title="Calls" description="Live call recording, transcripts, and AI call grades."
    bullets={["Real-time call capture via Twilio / managed number", "Searchable transcripts with intent tags", "AI-graded call quality + coaching prompts", "Automatic lead creation from missed calls"]} />;
}
export function Messages() {
  return <StubPage testId="stub-messages" eyebrow="Communications" title="Messages" description="Unified inbox for SMS, email, and web chat."
    bullets={["Omnichannel inbox across SMS, email, website chat", "AI drafts replies trained on your knowledge base", "Shared team inbox with assignments and SLAs", "Auto-tagging and sentiment detection"]} />;
}
export function Payments() {
  return <StubPage testId="stub-payments" eyebrow="Business" title="Payments" description="Collect payment on jobs, invoices, deposits."
    bullets={["One-tap invoice + card-on-file via Stripe", "Deposits and payment plans", "Tip jar and refund flows", "Automatic reconciliation to appointments"]} />;
}
export function Website() {
  return <StubPage testId="stub-website" eyebrow="Business" title="Website" description="A conversion-ready site in your brand."
    bullets={["Pre-styled pages seeded from your industry template", "Live editor with your tenant brand tokens applied", "Lead-capture widgets that pipe into Leads", "Zero-config hosting on your branded subdomain"]} />;
}
export function CustomerPortal() {
  return <StubPage testId="stub-customer-portal" eyebrow="Business" title="Customer Portal" description="Self-serve bookings, documents, and history."
    bullets={["Branded customer login + magic links", "Appointment self-serve and reschedule", "Document upload and signature capture", "Review request + loyalty rewards"]} />;
}
export function Reviews() {
  return <StubPage testId="stub-reviews" eyebrow="Business" title="Reviews" description="Request, respond, and showcase social proof."
    bullets={["Automated review requests after jobs", "AI reply drafts with your tone and brand", "Aggregation from Google, Yelp, Facebook", "Public review widget for your website"]} />;
}
export function Automations() {
  return <StubPage testId="stub-automations" eyebrow="Setup" title="Automations" description="Visual recipes that run your office in the background."
    bullets={["No-code triggers → actions builder", "Industry-template starter recipes", "AI step: let the model decide branches", "Audit log of every automation run"]} />;
}
export function Integrations() {
  return <StubPage testId="stub-integrations" eyebrow="Setup" title="Integrations" description="Plug your office into the tools you already use."
    bullets={["Google Calendar, Gmail, Outlook, QuickBooks, Jobber", "Zapier / Make bridges for everything else", "Industry-specific tools (ServiceTitan, Dentrix…)", "Managed OAuth + token rotation"]} />;
}
export function PhoneNumbers() {
  return <StubPage testId="stub-phone-numbers" eyebrow="Setup" title="Phone Numbers" description="Buy, port, and route numbers to your AI."
    bullets={["Instant local & toll-free provisioning", "Smart routing by hours, service area, intent", "Call tracking per campaign", "Compliance (A2P 10DLC) wizard"]} />;
}
