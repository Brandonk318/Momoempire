import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import { Privacy, Terms } from "@/pages/Legal";

// EMP-WL-002: waitlist-only build (REACT_APP_WAITLIST_ONLY=true). Only these three paths exist;
// anything else (login, signup, /app, /admin, public token pages, ...) redirects to "/".
export const WAITLIST_PATHS = ["/", "/privacy", "/terms"];

export function WaitlistRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function WaitlistApp() {
  return (
    <>
      <BrowserRouter>
        <WaitlistRoutes />
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}
