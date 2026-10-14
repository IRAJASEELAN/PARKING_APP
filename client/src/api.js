import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Default host for native Android APK when running on mobile device on the same local Wi-Fi
const DEFAULT_NATIVE_API_URL = "http://10.174.95.34:5000";

function apiBaseUrl() {
  const saved = localStorage.getItem("pf_api_url");
  if (saved) {
    const clean = saved.trim().replace(/\/+$/, "");
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const clean = envUrl.trim().replace(/\/+$/, "");
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  // When running natively inside Android APK (Capacitor)
  if (Capacitor.isNativePlatform()) {
    return `${DEFAULT_NATIVE_API_URL}/api`;
  }

  // Web browser development/production
  return "/api";
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
