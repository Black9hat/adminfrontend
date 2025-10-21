import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
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
      const res = await axios.post("/api/admin/login", { email, password });
      if (res.data && res.data.token) {
        login(res.data.token);
        navigate("/dashboard");
      } else {
        setError("Invalid response from server.");
      }
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        {error && (
          <div className="mb-3 text-red-600 text-sm font-semibold">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email"
            className="w-full mb-3 p-2 border rounded"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full mb-3 p-2 border rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
