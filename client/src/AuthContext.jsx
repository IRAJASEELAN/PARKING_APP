import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("pf_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("pf_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/users/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("pf_user", JSON.stringify(res.data));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("pf_token");
        localStorage.removeItem("pf_user");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      async login(email, password, portal = "user") {
        const { data } = await api.post("/auth/login", { email, password, portal });
        localStorage.setItem("pf_token", data.token);
        localStorage.setItem("pf_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        const { data } = await api.post("/auth/register", payload);
        localStorage.setItem("pf_token", data.token);
        localStorage.setItem("pf_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem("pf_token");
        localStorage.removeItem("pf_user");
        setToken(null);
        setUser(null);
      },
      setUser,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
