import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

export default function AdminLayout() {
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 shadow-lg p-4">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Go India Admin
        </h2>
        <nav className="flex flex-col gap-2">
         <Link to="/dashboard" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Dashboard</Link>
          <Link to="/drivers" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Drivers</Link>
          <Link to="/trips" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Trips</Link>
          <Link to="/customers" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Customers</Link>
          <Link to="/documents" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Documents</Link>
          <Link to="/notifications" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Notifications</Link>
          <Link to="/settings" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Settings</Link>
        </nav>
      </aside>

      {/* Sidebar (mobile overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white dark:bg-gray-800 shadow-lg p-4">
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              Go India Admin
            </h2>
            <nav className="flex flex-col gap-2">
             <Link onClick={() => setSidebarOpen(false)} to="/dashboard" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Dashboard</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/drivers" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Drivers</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/trips" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Trips</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/customers" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Customers</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/documents" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Documents</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/notifications" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Notifications</Link>
              <Link onClick={() => setSidebarOpen(false)} to="/settings" className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200">Settings</Link>
            </nav>
            <button
              className="mt-6 text-red-500 font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </button>
          </div>
          <div
            className="flex-1 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between bg-white dark:bg-gray-800 shadow px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger button (mobile) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Admin Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"}
            </button>

            {/* Admin Info + Logout */}
            <span className="text-gray-700 dark:text-gray-200 font-medium">
              👤 Admin
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 text-gray-800 dark:text-gray-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
