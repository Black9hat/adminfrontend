import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  tokenExpiry: Date | null;
  timeUntilExpiry: number | null;
}

interface DecodedToken {
  exp: number;
  email?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("adminToken")
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenExpiry, setTokenExpiry]         = useState<Date | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  // ── logout: clears state + redirects via React Router (no window.location) ──
  const logout = useCallback(() => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setIsAuthenticated(false);
    setTokenExpiry(null);
    setTimeUntilExpiry(null);
    navigate("/login", { replace: true });   // ✅ React Router, not window.location
  }, [navigate]);

  // ── login: validates token, saves, sets state ─────────────────────────────
  const login = useCallback((newToken: string) => {
    if (!newToken || newToken === "null" || newToken === "undefined") {
      console.error("❌ Invalid token received");
      return;
    }
    try {
      const decoded: DecodedToken = jwtDecode(newToken);
      if (Date.now() >= decoded.exp * 1000) {
        console.error("❌ Received token is already expired");
        return;
      }
      localStorage.setItem("adminToken", newToken);
      setToken(newToken);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("❌ Token decode error in login():", err);
    }
  }, []);

  // ── Listen for 401 events dispatched by axiosInstance ────────────────────
  useEffect(() => {
    const handler = () => logout();                // ✅ no alert(), silently redirect
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [logout]);

  // ── Validate token on mount / token change ────────────────────────────────
  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      setTokenExpiry(null);
      setTimeUntilExpiry(null);
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      const expiryDate = new Date(decoded.exp * 1000);
      const remaining  = decoded.exp * 1000 - Date.now();

      setTokenExpiry(expiryDate);
      setTimeUntilExpiry(remaining);

      if (remaining <= 0) {
        logout();   // ✅ no alert(), just redirect
        return;
      }

      setIsAuthenticated(true);

      // Auto-logout when token expires
      const timer = setTimeout(() => logout(), remaining);
      return () => clearTimeout(timer);
    } catch {
      logout();
    }
  }, [token, logout]);

  // ── Tick time-until-expiry every minute ──────────────────────────────────
  useEffect(() => {
    if (!tokenExpiry) return;
    const id = setInterval(() => {
      setTimeUntilExpiry(tokenExpiry.getTime() - Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, [tokenExpiry]);

  return (
    <AuthContext.Provider value={{
      token,
      login,
      logout,
      isAuthenticated,
      tokenExpiry,
      timeUntilExpiry,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}