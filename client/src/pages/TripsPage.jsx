import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import { fmtDate, fmtTime, CUR } from "../utils.js";
import { showToast } from "../components/Toast.jsx";

const STATUS_COLORS = {
  confirmed: { bg: "var(--mint-light)", text: "var(--bg-dark)", label: "Confirmed · pay on site" },
  held:      { bg: "#FFF7E6", text: "#874D00", label: "Held" },
  paid:      { bg: "var(--mint-light)", text: "var(--bg-dark)", label: "Paid" },
  active:    { bg: "var(--mint-light)", text: "var(--bg-dark)", label: "Active" },
  completed: { bg: "var(--bg)", text: "var(--text-muted)", label: "Completed" },
  cancelled: { bg: "#FFF1F0", text: "#CF1322", label: "Cancelled" },
  expired:   { bg: "#F5F5F5", text: "#6B7773", label: "Expired" },
};

export default function TripsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    api.get("/reservations")
      .then((r) => setReservations(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function cancelReservation(id) {
    if (!window.confirm("Cancel this reservation?")) return;
    try {
      const { data } = await api.post(`/reservations/${id}/cancel`);
      setReservations((items) => items.map((item) => item._id === id ? { ...item, ...data, status: "cancelled" } : item));
      showToast("Reservation cancelled");
    } catch (error) { showToast(error?.response?.data?.message || "Could not cancel this reservation"); }
  }

  const upcoming = reservations.filter((r) => ["held", "confirmed", "paid", "active"].includes(r.status));
  const past = reservations.filter((r) => ["completed", "cancelled", "expired"].includes(r.status));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="shell" style={{ background: "var(--bg)" }}>
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      {/* Header */}
      <div style={{ background: "#fff", padding: "16px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>My Trips</h2>
        <div style={{ display: "flex", gap: 0 }}>
          {["upcoming", "past"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "12px 0", border: "none", background: "none",
                fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer",
                color: tab === t ? "var(--bg-dark)" : "var(--text-muted)",
                borderBottom: `3px solid ${tab === t ? "var(--bg-dark)" : "transparent"}`,
                transition: "all .15s",
              }}
            >
              {t === "upcoming" ? "Upcoming" : "Past"} ({t === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="spin" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--mint)", borderRadius: "50%", margin: "0 auto" }} />
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🅿️</div>
            <h3 style={{ color: "var(--text-muted)" }}>No {tab} trips</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>
              {tab === "upcoming" ? "Reserve a space to see it here." : "Your parking history will appear here."}
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20, width: "auto", padding: "13px 28px" }} onClick={() => navigate("/app")}>
              Find parking
            </button>
          </div>
        ) : (
          list.map((r) => <TripCard key={r._id} reservation={r} onCancel={() => cancelReservation(r._id)} onClick={() => {
            if (r.status === "active") navigate(`/app/session/${r._id}`);
            else navigate(`/app/reservation/${r._id}`);
          }} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function TripCard({ reservation: r, onClick, onCancel }) {
  const status = STATUS_COLORS[r.status] || STATUS_COLORS.completed;
  const lot = r.lot;

  return (
    <div
      className="card"
      style={{ padding: "18px", marginBottom: 12, cursor: "pointer" }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{lot?.name || "Parking lot"}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{lot?.address}</div>
        </div>
        <span style={{ background: status.bg, color: status.text, fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "4px 10px", flexShrink: 0, marginLeft: 10 }}>
          {status.label}
        </span>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4 }}>
          <div style={{ color: "var(--text-muted)" }}>Date</div>
          <div style={{ fontWeight: 600 }}>{fmtDate(r.start)}</div>
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4 }}>
          <div style={{ color: "var(--text-muted)" }}>Time</div>
          <div style={{ fontWeight: 600 }}>{fmtTime(r.start)} – {fmtTime(r.end)}</div>
        </div>
        <div style={{ display: "flex", flex: 0, flexDirection: "column", gap: 4, textAlign: "right" }}>
          <div style={{ color: "var(--text-muted)" }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--bg-dark)" }}>{CUR}{Number(r.amount || 0).toFixed(0)}</div>
        </div>
      </div>

      {["held", "confirmed", "paid"].includes(r.status) && <button className="btn btn-outline" style={{ marginTop: 12, width: "100%" }} onClick={(event) => { event.stopPropagation(); onCancel(); }}>Cancel reservation</button>}

      {r.status === "active" && (
        <div style={{ marginTop: 12, background: "var(--mint-light)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mint)", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bg-dark)" }}>Active now · Tap to manage</span>
        </div>
      )}

      {r.qrPayload && r.status !== "active" && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <span>🎫</span>
          <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{r.bookingReference || r.qrPayload}</span>
        </div>
      )}
    </div>
  );
}



