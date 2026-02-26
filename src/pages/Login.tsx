import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_BASE = import.meta.env.DEV ? "" : "https://ghumobackend.onrender.com";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();
  const { login }               = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = res.data?.token;
      if (!token) {
        setError("Invalid response from server.");
        return;
      }

      login(token);                                // ✅ saves + validates via AuthContext
      navigate("/analytics", { replace: true });   // ✅ fixed: was /dashboard (didn't exist)
    } catch (err: any) {
      if (err.response?.status === 401)
        setError("Invalid email or password.");
      else if (err.code === "ERR_NETWORK")
        setError("Cannot connect to server. Please check your connection.");
      else
        setError(err.response?.data?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Syne','Segoe UI',sans-serif",
      padding: "1rem",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .lcard { animation: fadeIn 0.32s ease; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #13161e inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
        }
        .linput { transition: border-color 0.15s, box-shadow 0.15s; }
        .linput:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18) !important;
        }
        .lbtn { transition: opacity 0.15s, transform 0.1s; }
        .lbtn:hover:not(:disabled) { opacity: 0.88; }
        .lbtn:active:not(:disabled) { transform: scale(0.98); }
        .lbtn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="lcard" style={{
        width: "100%",
        maxWidth: 400,
        background: "#0e1015",
        border: "1px solid #1e2330",
        borderRadius: 20,
        padding: "2.5rem 2rem",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🚘</div>
          <div style={{ fontWeight: 900, fontSize: "1.4rem", color: "#f1f5f9", letterSpacing: "-0.03em" }}>
            GoIndia
          </div>
          <div style={{ fontSize: "0.62rem", fontFamily: "monospace", color: "#374151", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>
            Admin Panel
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginBottom: 6, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              className="linput"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@goindia.com"
              required
              autoComplete="username"
              style={{
                width: "100%",
                background: "#13161e",
                border: "1px solid #1e2330",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                color: "#f1f5f9",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginBottom: 6, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              className="linput"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "#13161e",
                border: "1px solid #1e2330",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                color: "#f1f5f9",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 10,
              padding: "0.65rem 1rem",
              color: "#f87171",
              fontSize: "0.82rem",
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="lbtn"
            style={{
              marginTop: 4,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              border: "none",
              borderRadius: 12,
              padding: "0.875rem",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              fontFamily: "'Syne','Segoe UI',sans-serif",
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.68rem", color: "#1f2937", fontFamily: "monospace" }}>
          GoIndia Admin · Restricted Access
        </div>
      </div>
    </div>
  );
}