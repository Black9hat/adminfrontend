import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Trips from "./pages/Trips";
import Customers from "./pages/Customer";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { AuthProvider } from "./AuthContext";
import FareManagement from "./pages/FareManagement";
import IncentiveSettings from "./pages/IncentivesManagement";
import CouponsManagementDashboard from "./pages/Couponsmanagement";
import AdminPromotions from "./pages/AdminPromotions";
import AdminSupport from "./pages/AdminSupport";
import ServiceAreaManagement from "./pages/Serviceareamanagement";
import HelpManagement from "./pages/Helpmanagement";
import ShortTripMonitor from "./pages/ShortTripMonitor";
import MoneyFlow from "./pages/Moneyflow"; // ✅ Money Flow Dashboard
import DriverEarningsManagement from "./pages/Driverearningsmanagement"; // ✅ NEW - Driver Earnings Management

export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes (Admin layout) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shorttrip-monitor" element={<ShortTripMonitor />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="trips" element={<Trips />} />
            <Route path="documents" element={<Documents />} />
            <Route path="fare-management" element={<FareManagement />} />
            <Route path="incentive-settings" element={<IncentiveSettings />} />
            <Route path="service-area-management" element={<ServiceAreaManagement />} />
            <Route path="money-flow" element={<MoneyFlow />} /> {/* ✅ Money Flow */}
            <Route path="driver-earnings" element={<DriverEarningsManagement />} /> {/* ✅ NEW - Driver Earnings Management */}
            <Route path="Coupons-management" element={<CouponsManagementDashboard />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="help-management" element={<HelpManagement />} />
            <Route path="admin/support" element={<AdminSupport />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}