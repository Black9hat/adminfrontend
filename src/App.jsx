import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trips" element={<div>Trips Page</div>} />
          <Route path="/drivers" element={<div>Drivers Page</div>} />
          <Route path="/customers" element={<div>Customers Page</div>} />
          <Route path="/documents" element={<div>Documents Page</div>} />
          <Route path="/notifications" element={<div>Notifications Page</div>} />
          <Route path="/settings" element={<div>Settings Page</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
