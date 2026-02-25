import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

// ✅ API Base URL - Use proxy in development, direct in production
const API_BASE = import.meta.env.DEV ? "" : "https://ghumobackend.onrender.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔐 Attempting admin login...");
      console.log("📍 API endpoint:", `${API_BASE}/api/admin/login`);
      
      const res = await axios.post(
        `${API_BASE}/api/admin/login`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log("📦 Login response:", res.data);

      if (res.data && res.data.token) {
        const token = res.data.token;
        
        console.log("🔑 Token received from server");
        console.log("   Preview:", token.substring(0, 30) + "...");
        
        // Save token using AuthContext
        login(token);
        
        // Navigate to dashboard
        setTimeout(() => {
          const savedToken = localStorage.getItem("adminToken");
          if (savedToken) {
            console.log("✅ SUCCESS: Token properly saved");
            navigate("/dashboard");
          } else {
            setError("Authentication error. Please try again.");
          }
        }, 100);
      } else {
        setError("Invalid response from server.");
      }
    } catch (err: any) {
      console.error("❌ Login error:", err);
      
      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Cannot connect to server. Please check your connection.");
      } else if (err.message?.includes('CORS')) {
        setError("CORS error. Backend needs to allow cross-origin requests.");
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🔐 Admin Login</h1>
          <p className="text-sm text-gray-600 mt-1">Sign in to access admin panel</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}