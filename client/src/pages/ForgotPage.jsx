import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api.js";
import Toast, { showToast } from "../components/Toast.jsx";

export default function ForgotPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signInPath = searchParams.get("portal") === "owner" ? "/owner/signin" : "/signin";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot", { email });
      setResetUrl(data.resetUrl || "");
      setSent(true);
      showToast("If the account exists, a reset link is ready");
    } catch (error) {
      showToast(error?.response?.data?.message || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  return <div className="shell" style={{ background: "#fff" }}><Toast /><div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div><div className="page-header"><button className="back-btn" onClick={() => navigate(signInPath)} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div><div style={{ padding: "8px 24px 40px", flex: 1, display: "flex", flexDirection: "column" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div><h2>Forgot password?</h2><p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>Enter your account email. We’ll send a one-hour reset link if an account matches.</p>{sent ? <div style={{ marginTop: 32, background: "var(--mint-light)", borderRadius: 20, padding: 24, textAlign: "center" }}><div style={{ fontSize: 40 }}>📬</div><h3 style={{ marginTop: 12 }}>Check your inbox</h3><p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 14 }}>If the address is registered, a reset link was sent to <b>{email}</b>.</p>{resetUrl && <a href={resetUrl} className="btn btn-primary" style={{ marginTop: 18, display: "block", textDecoration: "none" }}>Open local reset link</a>}<button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate(signInPath)}>Back to sign in</button></div> : <form onSubmit={handleSubmit} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}><div className="field"><label>Email address</label><input className="input" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div><button className="btn btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? .7 : 1 }}>{loading ? "Sending…" : "Send reset link"}</button></form>}</div></div>;
}
