import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api", // fallback to local backend
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add interceptor to attach token automatically
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
