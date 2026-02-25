// src/api/axiosInstance.ts
import axios from "axios";

// ✅ CRITICAL: Use the same API base URL as in Login.tsx
const API_BASE = "https://ghumobackend.onrender.com";

const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // ✅ ADD THIS LINE


  },
});

// ✅ Request Interceptor: Automatically add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ CRITICAL FIX: Changed from "token" to "adminToken" 
    const token = localStorage.getItem("adminToken");
    
    console.log('🔐 Axios Interceptor:', {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 30) + '...' : 'NONE'
    });

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor: Handle 401 errors (token expired/invalid)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ Axios response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });

    // If 401 Unauthorized, clear token and redirect to login
    if (error.response?.status === 401) {
      console.log('🚪 401 Unauthorized - Clearing token and redirecting to login');
      localStorage.removeItem("adminToken");
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;