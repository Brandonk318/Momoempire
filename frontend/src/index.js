import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import "@/i18n";

// EMP-WL-002: REACT_APP_WAITLIST_ONLY=true at build time serves only /, /privacy and /terms.
// The condition is a build-time constant, so webpack drops the unused branch: a waitlist build
// does not include App.js (dashboard, admin, auth pages) at all.
const App =
  process.env.REACT_APP_WAITLIST_ONLY === "true"
    ? require("@/waitlist/WaitlistApp").default
    : require("@/App").default;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
