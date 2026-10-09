// Estimator strings, kept in their own bundle so the shared locale files (edited by PR #2) are
// untouched. Plain labels only. TODO(marketing): headline/intro/result copy is not written yet.
import i18n from "@/i18n";

const en = {
  estimator: {
    title: "Find your plan",
    intro: "", // TODO(marketing): intro copy
    loading: "Loading…",
    industry: "Business type",
    industryOther: "Other",
    locations: "Number of locations",
    users: "Team members who need access",
    calls: "Calls per month (estimate)",
    sms: "Text messages per month (estimate)",
    capabilities: "What do you need?",
    submit: "See my plan",
    band: { none: "None", upTo: "Up to {{n}}", range: "{{from}}–{{to}}", over: "More than {{n}}" },
    cap: {
      ai_receptionist: "AI receptionist",
      booking: "Appointment booking",
      reviews: "Review requests",
      customer_portal: "Customer portal",
      business_advisor: "AI business advisor",
      sales_intel: "Sales intelligence",
      growth_autopilot: "Growth autopilot",
      payments: "Invoices and payments",
    },
    result: {
      heading: "Suggested plan",
      perMonth: "/mo",
      limitsHeading: "Monthly limits",
      limit: { calls: "Calls", sms: "Text messages", locations: "Locations", users: "Users" },
      customTitle: "Custom plan",
      customBody: "Your answers go beyond our standard plans.",
      exceeded: "Above standard limits: {{list}}",
      unavailable: "Plan details aren't available right now. Please try again later.",
      seePricing: "See all plans",
    },
    email: {
      heading: "Email me this result (optional)",
      label: "Email",
      submit: "Send",
      sent: "Thanks. We received your request.",
      privacy: "Privacy policy",
    },
    entry: "Not sure which plan fits? Find your plan",
  },
};

const es = {
  estimator: {
    title: "Encuentre su plan",
    intro: "", // TODO(marketing)
    loading: "Cargando…",
    industry: "Tipo de negocio",
    industryOther: "Otro",
    locations: "Número de sucursales",
    users: "Miembros del equipo que necesitan acceso",
    calls: "Llamadas por mes (aproximado)",
    sms: "Mensajes de texto por mes (aproximado)",
    capabilities: "¿Qué necesita?",
    submit: "Ver mi plan",
    band: { none: "Ninguno", upTo: "Hasta {{n}}", range: "{{from}}–{{to}}", over: "Más de {{n}}" },
    cap: {
      ai_receptionist: "Recepcionista con IA",
      booking: "Reserva de citas",
      reviews: "Solicitudes de reseñas",
      customer_portal: "Portal de clientes",
      business_advisor: "Asesor de negocio con IA",
      sales_intel: "Inteligencia de ventas",
      growth_autopilot: "Piloto automático de crecimiento",
      payments: "Facturas y pagos",
    },
    result: {
      heading: "Plan sugerido",
      perMonth: "/mes",
      limitsHeading: "Límites mensuales",
      limit: { calls: "Llamadas", sms: "Mensajes de texto", locations: "Sucursales", users: "Usuarios" },
      customTitle: "Plan personalizado",
      customBody: "Sus respuestas superan nuestros planes estándar.",
      exceeded: "Por encima de los límites estándar: {{list}}",
      unavailable: "Los detalles de los planes no están disponibles ahora. Inténtelo más tarde.",
      seePricing: "Ver todos los planes",
    },
    email: {
      heading: "Enviarme este resultado (opcional)",
      label: "Correo electrónico",
      submit: "Enviar",
      sent: "Gracias. Recibimos su solicitud.",
      privacy: "Política de privacidad",
    },
    entry: "¿No sabe qué plan le conviene? Encuentre su plan",
  },
};

i18n.addResourceBundle("en", "translation", en, true, false);
i18n.addResourceBundle("es", "translation", es, true, false);

export default i18n;
