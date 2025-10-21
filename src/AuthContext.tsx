import {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";
import { jwtDecode } from "jwt-decode";
import type { ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decoded: { exp: number } = jwtDecode(token);
        const isExpired = Date.now() >= decoded.exp * 1000;
        if (isExpired) {
          logout();
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        logout();
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
