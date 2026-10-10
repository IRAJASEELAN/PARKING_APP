import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../SearchContext.jsx";

const permissions = [
  {
    id: "location",
    icon: "📍",
    title: "Location",
    desc: "Find parking near you and navigate to your spot.",
    defaultOn: true,
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "Notifications",
    desc: "Get reminders before your session expires.",
    defaultOn: false,
  },
];

export default function PermissionsPage() {
  const navigate = useNavigate();
  const { useCurrentLocation } = useSearch();
  async function continueToSignIn() {
    if (perms.location) {
      try { await useCurrentLocation(); } catch { /* User can continue without GPS access. */ }
    }
    navigate("/signin");
  }
  const [perms, setPerms] = useState(() =>
    Object.fromEntries(permissions.map((p) => [p.id, p.defaultOn]))
  );

  function toggle(id) {
    setPerms((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="shell" style={{ background: "#fff" }}>
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      {/* Back */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ padding: "8px 24px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="fade-up">
          <div style={{ fontSize: 42, marginBottom: 12 }}>🚗</div>
          <h2>Set up a safer,<br />smarter drive</h2>
          <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>
            ParkFlow needs a couple of permissions to help you find parking fast. You can change these any time in Settings.
          </p>
        </div>

        {/* Permission toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 36 }}>
          {permissions.map((p, i) => (
            <div
              key={p.id}
              className={`fade-up fade-up-${i + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: perms[p.id] ? "var(--mint-light)" : "var(--bg)",
                borderRadius: "var(--r-xl)",
                padding: "18px 20px",
                border: `1.5px solid ${perms[p.id] ? "var(--mint-mid)" : "var(--border)"}`,
                transition: "all .2s",
              }}
            >
              <div style={{ fontSize: 28, width: 44, textAlign: "center" }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={perms[p.id]} onChange={() => toggle(p.id)} />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 40 }}>
          <button className="btn btn-primary" onClick={continueToSignIn}>
            Allow and continue
          </button>
          <button className="btn btn-ghost" style={{ color: "var(--text-muted)" }} onClick={() => navigate("/signin")}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}


