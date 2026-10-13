import { useNavigate } from "react-router-dom";

/* P-mark logo SVG */
function PLogoWhite() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="14" fill="rgba(255,255,255,0.12)" />
      <text x="13" y="34" fontFamily="Inter,sans-serif" fontSize="26" fontWeight="800" fill="#3DDC97">P</text>
    </svg>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="shell" style={{ background: "#0D1A16", color: "#fff", overflow: "hidden", position: "relative" }}>
      {/* Status bar */}
      <div className="status-bar light">
        <span>9:41</span>
        <div className="status-icons">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Skip */}
      <div style={{ position: "absolute", top: 14, right: 20, zIndex: 10 }}>
        <button
          onClick={() => navigate("/signin")}
          style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Skip
        </button>
      </div>

      {/* Hero photo */}
      <div style={{ position: "relative", height: 320, overflow: "hidden", borderRadius: "0 0 32px 32px" }}>
        <img
          src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80"
          alt="Parking garage aerial"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0D1A16 0%, transparent 60%)" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px 40px" }}>
        <div className="fade-up">
          <PLogoWhite />
          <h1 style={{ marginTop: 16, color: "#fff", fontSize: 36, lineHeight: 1.1 }}>
            Park less.<br />
            <span style={{ color: "#3DDC97" }}>Move better.</span>
          </h1>
          <p style={{ marginTop: 12, color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.6 }}>
            Find, reserve, and navigate to parking spots around Chennai — in seconds.
          </p>
        </div>

        {/* Stats row */}
        <div className="fade-up fade-up-1" style={{ display: "flex", gap: 32, marginTop: 32 }}>
          {[["50+", "Garages"], ["24/7", "Available"], ["4.8★", "Rating"]].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{val}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div className="fade-up fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            className="btn btn-mint"
            style={{ fontSize: 17, padding: "18px 24px" }}
            onClick={() => navigate("/permissions")}
          >
            Start finding parking →
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: "rgba(255,255,255,.5)" }}
            onClick={() => navigate("/signin")}
          >
            Already have an account? Sign in
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: "rgba(255,255,255,.72)", fontSize: 13 }}
            onClick={() => navigate("/owner/signin")}
          >
            Parking facility owner? Sign in here
          </button>
        </div>
      </div>
    </div>
  );
}
