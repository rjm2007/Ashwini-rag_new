import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
});

api.interceptors.request.use((config) => {
  // This function adds JWT token to every outgoing request if available.
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // This function handles auth failure by redirecting to login.
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
