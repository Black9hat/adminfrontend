// AuthContext.tsx - Replace your existing file with this
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
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("adminToken");
    console.log('🔐 AuthProvider init - Token from storage:', storedToken ? 'FOUND' : 'NOT FOUND');
    return storedToken;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  const logout = () => {
    console.log('🚪 logout() called');
    
    localStorage.removeItem("adminToken");
    setToken(null);
    setIsAuthenticated(false);
    setTokenExpiry(null);
    setTimeUntilExpiry(null);
    
    console.log('✅ Logged out: token removed, state cleared');
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  // ✅ Check token expiry and auto-logout
  useEffect(() => {
    console.log('🔄 AuthProvider useEffect - Token state:', token ? 'EXISTS' : 'NULL');
    
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const expiryDate = new Date(decoded.exp * 1000);
        const now = Date.now();
        const isExpired = now >= decoded.exp * 1000;
        
        console.log('🔐 Token expiry check:', {
          isExpired,
          expiryDate: expiryDate.toLocaleString(),
          timeRemaining: isExpired ? 'EXPIRED' : `${Math.floor((decoded.exp * 1000 - now) / 60000)} minutes`
        });
        
        setTokenExpiry(expiryDate);
        setTimeUntilExpiry(decoded.exp * 1000 - now);
        
        if (isExpired) {
          console.log('⏰ Token expired, logging out...');
          alert('Your session has expired. Please login again.');
          logout();
          return;
        }
        
        console.log('✅ Token valid, setting authenticated');
        setIsAuthenticated(true);
        
        // ✅ Set up auto-logout timer
        const timeoutId = setTimeout(() => {
          console.log('⏰ Token expired (timeout), auto-logout');
          alert('Your session has expired. Please login again.');
          logout();
        }, decoded.exp * 1000 - now);
        
        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.error('❌ Token decode error:', error);
        logout();
      }
    } else {
      console.log('❌ No token, not authenticated');
      setIsAuthenticated(false);
      setTokenExpiry(null);
      setTimeUntilExpiry(null);
    }
  }, [token]);

  // ✅ Update time until expiry every minute
  useEffect(() => {
    if (!tokenExpiry) return;
    
    const intervalId = setInterval(() => {
      const remaining = tokenExpiry.getTime() - Date.now();
      setTimeUntilExpiry(remaining);
      
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [tokenExpiry]);

  const login = (newToken: string) => {
    console.log('🔓 login() called');
    console.log('📦 Received token:', newToken ? newToken.substring(0, 30) + '...' : 'NULL/UNDEFINED');
    console.log('🔢 Token length:', newToken?.length || 0);
    
    if (!newToken || newToken === 'null' || newToken === 'undefined') {
      console.error('❌ Invalid token received in login()');
      return;
    }
    
    try {
      // Verify token is valid before saving
      const decoded: DecodedToken = jwtDecode(newToken);
      const isExpired = Date.now() >= decoded.exp * 1000;
      
      if (isExpired) {
        console.error('❌ Received token is already expired!');
        alert('Login failed: Token is expired. Please contact support.');
        return;
      }
      
      // Save to localStorage
      localStorage.setItem("adminToken", newToken);
      console.log('💾 Token saved to localStorage with key "adminToken"');
      
      // Update state
      setToken(newToken);
      setIsAuthenticated(true);
      console.log('✅ State updated: token and isAuthenticated set');
      
      // Verify it was saved
      const verification = localStorage.getItem("adminToken");
      if (verification === newToken) {
        console.log('✅ VERIFICATION PASSED: Token correctly saved');
      } else {
        console.error('❌ VERIFICATION FAILED: Token mismatch!');
        console.error('Expected:', newToken.substring(0, 30) + '...');
        console.error('Got:', verification?.substring(0, 30) + '...' || 'NULL');
      }
    } catch (error) {
      console.error('❌ Error in login():', error);
      alert('Login failed: Invalid token format');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      login, 
      logout, 
      isAuthenticated,
      tokenExpiry,
      timeUntilExpiry
    }}>
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