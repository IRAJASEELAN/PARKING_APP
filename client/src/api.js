import axios from "axios";

function apiBaseUrl() {
  const saved = localStorage.getItem("pf_api_url");
  const configured = saved || import.meta.env.VITE_API_URL || "";
  if (!configured) return "/api";
  const clean = configured.trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

const api = axios.create({ baseURL: apiBaseUrl() });

export function getApiServerUrl() {
  const base = api.defaults.baseURL || "";
  return base.startsWith("http") ? base.replace(/\/api\/?$/, "") : "";
}

export function setApiServerUrl(url) {
  const clean = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(clean)) throw new Error("Enter a full address starting with http:// or https://");
  localStorage.setItem("pf_api_url", clean);
  api.defaults.baseURL = clean.endsWith("/api") ? clean : `${clean}/api`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
