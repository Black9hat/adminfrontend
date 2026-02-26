import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import { useAuth } from "./AuthContext";

// ── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Existing pages ────────────────────────────────────────────────────────────
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const RideManagement     = lazy(() => import("./pages/RideManagement"));
const PaymentRefund      = lazy(() => import("./pages/PaymentRefund"));
const DriverManagement   = lazy(() => import("./pages/DriverManagement"));
const MoneyFlow          = lazy(() => import("./pages/Moneyflow"));
const LegalCompliance    = lazy(() => import("./pages/LegalCompliance"));

// ── Named exports from multi-component files ──────────────────────────────────
const UserManagement   = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.UserManagement })));
const RatingsReviews   = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.RatingsReviews })));
const TechMonitoring   = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.TechnicalMonitoring })));
const GPSMonitoring    = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.GPSMonitoring })));
const SafetyComplaints = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.SafetyComplaints })));
const ParcelManagement = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.ParcelManagement })));
const FarePricing      = lazy(() => import("./pages/FareFraud").then(m => ({ default: m.FarePricing })));
const FraudDetection   = lazy(() => import("./pages/FareFraud").then(m => ({ default: m.FraudDetection })));

// ── New pages ─────────────────────────────────────────────────────────────────
const FareManagement       = lazy(() => import("./pages/FareManagement"));
const DriverEarnings       = lazy(() => import("./pages/Driverearningsmanagement"));
const ServiceAreas         = lazy(() => import("./pages/Serviceareamanagement"));
const CustomersPage        = lazy(() => import("./pages/Customer"));
const AdminPromotions      = lazy(() => import("./pages/AdminPromotions"));
const IncentivesManagement = lazy(() => import("./pages/IncentivesManagement"));
const AdminSupport         = lazy(() => import("./pages/AdminSupport"));
const NotificationPage     = lazy(() => import("./pages/Notifications"));
const HelpManagement       = lazy(() => import("./pages/Helpmanagement"));
const DocumentsPage        = lazy(() => import("./pages/Documents"));   // ✅ added

const Loading = () => <Spinner label="Loading page…" />;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>

        {/* ── Public: Login ──────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />

        {/* ── Root redirect ──────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/analytics" replace />} />

        {/* ── Protected: all pages require a valid token ─────────────────── */}
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          {/* Overview */}
          <Route path="/analytics"          element={<AnalyticsDashboard />} />
          <Route path="/money-flow"         element={<MoneyFlow />} />

          {/* Operations */}
          <Route path="/rides"              element={<RideManagement />} />
          <Route path="/drivers"            element={<DriverManagement />} />
          <Route path="/earnings"           element={<DriverEarnings />} />
          <Route path="/documents"          element={<DocumentsPage />} />
          <Route path="/parcels"            element={<ParcelManagement />} />
          <Route path="/gps"                element={<GPSMonitoring />} />
          <Route path="/service-areas"      element={<ServiceAreas />} />

          {/* Users */}
          <Route path="/customers"          element={<CustomersPage />} />
          <Route path="/ratings"            element={<RatingsReviews />} />

          {/* Finance */}
          <Route path="/payments"           element={<PaymentRefund />} />
          <Route path="/fare-management"    element={<FareManagement />} />
          <Route path="/fare-pricing"       element={<FarePricing />} />
          <Route path="/promotions"         element={<AdminPromotions />} />
          <Route path="/incentives"         element={<IncentivesManagement />} />

          {/* Safety & Trust */}
          <Route path="/safety"             element={<SafetyComplaints />} />
          <Route path="/support"            element={<AdminSupport />} />
          <Route path="/fraud"              element={<FraudDetection />} />

          {/* System */}
          <Route path="/tech"               element={<TechMonitoring />} />
          <Route path="/legal"              element={<LegalCompliance />} />
          <Route path="/notifications"      element={<NotificationPage />} />
          <Route path="/help"               element={<HelpManagement />} />
        </Route>

        {/* ── Catch-all ──────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/analytics" replace />} />

      </Routes>
    </Suspense>
  );
}