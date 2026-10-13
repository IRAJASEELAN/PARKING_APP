import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import Toast from "../components/Toast.jsx";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const initialAccountType = searchParams.get("type") === "owner" ? "owner" : "driver";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", accountType: initialAccountType, organizationName: "", phone: "", businessAddress: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, accountType: form.accountType, organizationName: form.organizationName, phone: form.phone, businessAddress: form.businessAddress });
      navigate(form.accountType === "owner" ? "/app/owner" : "/app");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell" style={{ background: "#fff" }}>
      <Toast />
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/signin")} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ padding: "8px 24px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#3DDC97", fontWeight: 800, fontSize: 22 }}>P</span>
        </div>

        <div className="fade-up" style={{ marginTop: 24 }}>
          <h2>Create account</h2>
          <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 15 }}>Join ParkFlow and start parking smarter.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="account-type">Account type</label>
            <select id="account-type" className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
              <option value="driver">I’m looking for parking</option>
              <option value="owner">I manage a parking facility</option>
            </select>
          </div>

          {form.accountType === "owner" && <>
            <div className="field">
              <label htmlFor="organization-name">Business or facility group</label>
              <input id="organization-name" className="input" type="text" placeholder="Your parking business" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required maxLength={120} autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="owner-phone">Contact phone</label>
              <input id="owner-phone" className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={24} autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="business-address">Business address</label>
              <input id="business-address" className="input" type="text" placeholder="Street, area, city" value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} maxLength={240} autoComplete="street-address" />
            </div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.45 }}>Your owner account and submitted facilities are reviewed before they appear as bookable to drivers.</p>
          </>}

          <div className="field">
            <label>Full name</label>
            <input className="input" type="text" placeholder="Jordan Lee" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
          </div>

          <div className="field">
            <label>Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" placeholder="Min. 8 characters" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </div>

          <div className="field">
            <label>Confirm password</label>
            <input className="input" type="password" placeholder="Repeat password" value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password" />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, opacity: loading ? .7 : 1 }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={{ flex: 1 }} />

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 15, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/signin" style={{ color: "var(--bg-dark)", fontWeight: 700, textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

