import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import { Spinner } from "./components/ui";

// ── Lazy imports for all 13 modules ──────────────────────────────────────────
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const RideManagement     = lazy(() => import("./pages/RideManagement"));
const PaymentRefund      = lazy(() => import("./pages/PaymentRefund"));
const DriverManagement   = lazy(() => import("./pages/DriverManagement"));
const UserManagement     = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.UserManagement })));
const GPSMonitoring      = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.GPSMonitoring  })));
const SafetyComplaints   = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.SafetyComplaints })));
const ParcelManagement   = lazy(() => import("./pages/GPSSafetyParcel").then(m => ({ default: m.ParcelManagement })));
const RatingsReviews     = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.RatingsReviews })));
const TechMonitoring     = lazy(() => import("./pages/UserRatingsTech").then(m => ({ default: m.TechnicalMonitoring })));
const FarePricing        = lazy(() => import("./pages/FareFraud").then(m => ({ default: m.FarePricing })));
const FraudDetection     = lazy(() => import("./pages/FareFraud").then(m => ({ default: m.FraudDetection })));
const LegalCompliance    = lazy(() => import("./pages/LegalCompliance"));
const MoneyFlow          = lazy(() => import("./pages/Moneyflow"));

// Pre-existing pages
const FareManagement     = lazy(() => import("./pages/FareManagement"));
const ServiceAreas       = lazy(() => import("./pages/Serviceareamanagement").catch(() => ({ default: () => null })));

const Loading = () => <Spinner label="Loading page…" />;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/analytics" replace />} />

        {/* Admin layout wrapper */}
        <Route element={<AdminLayout />}>
          {/* ── Module 12: Analytics (default) */}
          <Route path="/analytics"          element={<AnalyticsDashboard />} />

          {/* ── Module 1: Ride Management */}
          <Route path="/rides"              element={<RideManagement />} />

          {/* ── Module 9: Driver Management */}
          <Route path="/drivers"            element={<DriverManagement />} />

          {/* ── Module 6: User / Customer Management */}
          <Route path="/customers"          element={<UserManagement />} />

          {/* ── Module 2: Payment & Refund */}
          <Route path="/payments"           element={<PaymentRefund />} />

          {/* ── Module 3: GPS Monitoring */}
          <Route path="/gps"                element={<GPSMonitoring />} />

          {/* ── Module 4: Safety & Complaints */}
          <Route path="/safety"             element={<SafetyComplaints />} />

          {/* ── Module 5: Parcel Management */}
          <Route path="/parcels"            element={<ParcelManagement />} />

          {/* ── Module 7: Ratings & Reviews */}
          <Route path="/ratings"            element={<RatingsReviews />} />

          {/* ── Module 8: Technical Monitoring */}
          <Route path="/tech"               element={<TechMonitoring />} />

          {/* ── Module 10: Fare & Pricing */}
          <Route path="/fare-management"    element={<FareManagement />} />
          <Route path="/fare-pricing"       element={<FarePricing />} />

          {/* ── Module 11: Fraud Detection */}
          <Route path="/fraud"              element={<FraudDetection />} />

          {/* ── Module 13: Legal & Compliance */}
          <Route path="/legal"              element={<LegalCompliance />} />

          {/* ── Money Flow */}
          <Route path="/money-flow"         element={<MoneyFlow />} />

          {/* ── Service Areas (existing) */}
          <Route path="/service-areas"      element={<ServiceAreas />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/analytics" replace />} />
      </Routes>
    </Suspense>
  );
}