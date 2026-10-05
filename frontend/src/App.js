import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import AdminLayout from "@/components/layouts/AdminLayout";

// Public
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import PublicBusiness from "@/pages/PublicBusiness";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

// Dashboard
import Home from "@/pages/dashboard/Home";
import AIEmployee from "@/pages/dashboard/AIEmployee";
import Services from "@/pages/dashboard/Services";
import Customers from "@/pages/dashboard/Customers";
import Leads from "@/pages/dashboard/Leads";
import Appointments from "@/pages/dashboard/Appointments";
import KnowledgeBase from "@/pages/dashboard/KnowledgeBase";
import BusinessAdvisor from "@/pages/dashboard/BusinessAdvisor";
import Analytics from "@/pages/dashboard/Analytics";
import Billing from "@/pages/dashboard/Billing";
import Usage from "@/pages/dashboard/Usage";
import Settings from "@/pages/dashboard/Settings";
import {
  Calls, Messages, Payments, Website, CustomerPortal, Reviews,
  Automations, Integrations, PhoneNumbers,
} from "@/pages/dashboard/Stubs";

// Admin
import AdminOverview from "@/pages/admin/Overview";
import AdminTenants from "@/pages/admin/Tenants";
import AdminIndustries from "@/pages/admin/Industries";
import AdminCountries from "@/pages/admin/Countries";
import FeatureFlags from "@/pages/admin/FeatureFlags";
import SystemHealth from "@/pages/admin/SystemHealth";

const AppShell = ({ children }) => <DashboardLayout>{children}</DashboardLayout>;
const AdminShell = ({ children }) => <AdminLayout>{children}</AdminLayout>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/b/:slug" element={<PublicBusiness />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Dashboard */}
          <Route path="/app" element={<ProtectedRoute><AppShell><Home /></AppShell></ProtectedRoute>} />
          <Route path="/app/ai-employee" element={<ProtectedRoute><AppShell><AIEmployee /></AppShell></ProtectedRoute>} />
          <Route path="/app/calls" element={<ProtectedRoute><AppShell><Calls /></AppShell></ProtectedRoute>} />
          <Route path="/app/messages" element={<ProtectedRoute><AppShell><Messages /></AppShell></ProtectedRoute>} />
          <Route path="/app/leads" element={<ProtectedRoute><AppShell><Leads /></AppShell></ProtectedRoute>} />
          <Route path="/app/customers" element={<ProtectedRoute><AppShell><Customers /></AppShell></ProtectedRoute>} />
          <Route path="/app/appointments" element={<ProtectedRoute><AppShell><Appointments /></AppShell></ProtectedRoute>} />
          <Route path="/app/services" element={<ProtectedRoute><AppShell><Services /></AppShell></ProtectedRoute>} />
          <Route path="/app/payments" element={<ProtectedRoute><AppShell><Payments /></AppShell></ProtectedRoute>} />
          <Route path="/app/website" element={<ProtectedRoute><AppShell><Website /></AppShell></ProtectedRoute>} />
          <Route path="/app/customer-portal" element={<ProtectedRoute><AppShell><CustomerPortal /></AppShell></ProtectedRoute>} />
          <Route path="/app/reviews" element={<ProtectedRoute><AppShell><Reviews /></AppShell></ProtectedRoute>} />
          <Route path="/app/analytics" element={<ProtectedRoute><AppShell><Analytics /></AppShell></ProtectedRoute>} />
          <Route path="/app/advisor" element={<ProtectedRoute><AppShell><BusinessAdvisor /></AppShell></ProtectedRoute>} />
          <Route path="/app/knowledge" element={<ProtectedRoute><AppShell><KnowledgeBase /></AppShell></ProtectedRoute>} />
          <Route path="/app/automations" element={<ProtectedRoute><AppShell><Automations /></AppShell></ProtectedRoute>} />
          <Route path="/app/integrations" element={<ProtectedRoute><AppShell><Integrations /></AppShell></ProtectedRoute>} />
          <Route path="/app/phone-numbers" element={<ProtectedRoute><AppShell><PhoneNumbers /></AppShell></ProtectedRoute>} />
          <Route path="/app/usage" element={<ProtectedRoute><AppShell><Usage /></AppShell></ProtectedRoute>} />
          <Route path="/app/billing" element={<ProtectedRoute><AppShell><Billing /></AppShell></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute platformAdmin><AdminShell><AdminOverview /></AdminShell></ProtectedRoute>} />
          <Route path="/admin/tenants" element={<ProtectedRoute platformAdmin><AdminShell><AdminTenants /></AdminShell></ProtectedRoute>} />
          <Route path="/admin/industries" element={<ProtectedRoute platformAdmin><AdminShell><AdminIndustries /></AdminShell></ProtectedRoute>} />
          <Route path="/admin/countries" element={<ProtectedRoute platformAdmin><AdminShell><AdminCountries /></AdminShell></ProtectedRoute>} />
          <Route path="/admin/feature-flags" element={<ProtectedRoute platformAdmin><AdminShell><FeatureFlags /></AdminShell></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute platformAdmin><AdminShell><SystemHealth /></AdminShell></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
