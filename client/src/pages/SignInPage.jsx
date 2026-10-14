import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

function ParkFlowLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: "#3DDC97", fontWeight: 800, fontSize: 22 }}>P</span>
      </div>
      <span style={{ fontWeight: 800, fontSize: 20, color: "var(--text)" }}>ParkFlow</span>
    </div>
  );
}

export default function SignInPage({ portal = "user" }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const isOwnerPortal = portal === "owner";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password, portal);
      navigate(user?.role === "owner" ? "/app/owner" : user?.role === "admin" ? "/app/admin" : "/app");
    } catch (err) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message === "Network Error" || !err?.response) {
        setError("Cannot connect to server. Please turn on Wi-Fi and connect to the same Wi-Fi as your computer.");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell" style={{ background: "#fff" }}>
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ padding: "8px 24px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        <ParkFlowLogo />

        <div className="fade-up" style={{ marginTop: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--mint-light)", color: "var(--bg-dark)", borderRadius: 999, padding: "6px 11px", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            <span aria-hidden="true">{isOwnerPortal ? "▦" : "⌖"}</span>{isOwnerPortal ? "FACILITY OWNER PORTAL" : "DRIVER PORTAL"}
          </div>
          <h2>{isOwnerPortal ? "Owner sign in" : "Welcome back"}</h2>
          <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 15 }}>{isOwnerPortal ? "Manage your parking facilities and driver arrivals." : "Sign in to find and book parking."}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Password</label>
              <Link to={isOwnerPortal ? "/forgot?portal=owner" : "/forgot"} style={{ fontSize: 13, color: "var(--bg-dark)", fontWeight: 600, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, opacity: loading ? .7 : 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 24, border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          {isOwnerPortal ? "Looking for parking instead?" : "Do you manage a parking facility?"}{" "}
          <Link to={isOwnerPortal ? "/signin" : "/owner/signin"} style={{ color: "var(--bg-dark)", fontWeight: 700, textDecoration: "none" }}>
            {isOwnerPortal ? "Driver sign in" : "Owner sign in"}
          </Link>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 15, color: "var(--text-muted)" }}>
          {isOwnerPortal ? "New to ParkFlow?" : "Don't have an account?"}{" "}
          <Link to={isOwnerPortal ? "/signup?type=owner" : "/signup?type=driver"} style={{ color: "var(--bg-dark)", fontWeight: 700, textDecoration: "none" }}>
            {isOwnerPortal ? "Register as an owner" : "Create account"}
          </Link>
        </div>
      </div>
    </div>
  );
}
