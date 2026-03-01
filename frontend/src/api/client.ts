import { API_BASE_URL } from "@/config";
import axios from "axios";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const tokens = localStorage.getItem("tokens");
  if (tokens) {
    const parsed = JSON.parse(tokens);
    config.headers.Authorization = `Bearer ${parsed.access}`;
  }
  return config;
});

// Auto-refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const tokens = localStorage.getItem("tokens");
        if (!tokens) throw new Error("No tokens");
        const { refresh } = JSON.parse(tokens);
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
        const newTokens = { ...JSON.parse(tokens), access: data.access };
        localStorage.setItem("tokens", JSON.stringify(newTokens));
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem("tokens");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
