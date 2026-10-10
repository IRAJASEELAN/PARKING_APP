import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api.js";
import Toast, { showToast } from "../components/Toast.jsx";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const token = params.get("token") || "";

  async function submit(event) {
    event.preventDefault();
    if (!token) return showToast("This reset link is missing or invalid");
    if (password !== confirm) return showToast("The passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/reset", { token, password });
      showToast("Password updated. Please sign in.");
      navigate("/signin", { replace: true });
    } catch (error) {
      showToast(error?.response?.data?.message || "This reset link is invalid or expired");
    } finally { setLoading(false); }
  }

  return <div className="shell" style={{ background: "#fff" }}><Toast /><div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div><div style={{ padding: "32px 24px", flex: 1 }}><h2>Choose a new password</h2><p style={{ marginTop: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>Use at least 8 characters. Reset links expire after one hour.</p>{token ? <form onSubmit={submit} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}><div className="field"><label>New password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></div><div className="field"><label>Confirm password</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></div><button className="btn btn-primary" disabled={loading}>{loading ? "Updating…" : "Update password"}</button></form> : <p style={{ marginTop: 24 }}>This link is incomplete or expired. <Link to="/forgot">Request another reset link</Link>.</p>}</div></div>;
}
