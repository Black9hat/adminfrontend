// ... existing code ...
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

export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}

          {/* Redirect root to login if not authenticated */}
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
            <Route path="drivers" element={<Drivers />} />
            <Route path="trips" element={<Trips />} />
            <Route path="customers" element={<Customers />} />
            <Route path="documents" element={<Documents />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}