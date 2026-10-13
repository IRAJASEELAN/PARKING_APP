import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import QRCode from "qrcode";
import { fmtCountdown, fmtTime, fmtDate, fmtDuration } from "../utils.js";
import Toast, { showToast } from "../components/Toast.jsx";

export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [countdown, setCountdown] = useState("00:00:00");
  const timerRef = useRef(null);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    fetchReservation();
  }, [id]);

  async function fetchReservation() {
    try {
      const { data } = await api.get(`/reservations/${id}`);
      setReservation(data);
    } catch {
      navigate("/app");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!reservation?.end) return;
    timerRef.current = setInterval(() => {
      setCountdown(fmtCountdown(reservation.end));
    }, 1000);
    setCountdown(fmtCountdown(reservation.end));
    return () => clearInterval(timerRef.current);
  }, [reservation]);

  useEffect(() => {
    if (!["confirmed", "paid"].includes(reservation?.status) || !reservation?.qrPayload || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, reservation.qrPayload, { width: 200, margin: 1, errorCorrectionLevel: "M" }).catch(() => {});
  }, [reservation]);

  async function handleExtend() {
    setExtending(true);
    try {
      const { data } = await api.post(`/reservations/${id}/extend`, { hours: 1 });
      setReservation(data);
      showToast("+1 hour added to your session");
    } catch {
      showToast("Could not extend. Try again.");
    } finally {
      setExtending(false);
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)" }}>
        <div className="spin" style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,.2)", borderTopColor: "var(--mint)", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!reservation) return null;

  const lot = reservation.lot;
  const isExpired = new Date(reservation.end) < new Date();

  return (
    <div className="shell" style={{ background: "var(--bg-dark)", overflowY: "auto" }}>
      <Toast />

      {/* Status bar */}
      <div className="status-bar light"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      {/* Active badge */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <div style={{ background: "rgba(61,220,151,.15)", border: "1px solid rgba(61,220,151,.4)", borderRadius: 20, padding: "6px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mint)", animation: "pulse 1.5s infinite" }} />
            <span style={{ color: "var(--mint)", fontSize: 13, fontWeight: 700, letterSpacing: .5 }}>{reservation.status === "active" ? "ACTIVE PARKING SESSION" : ["confirmed", "paid"].includes(reservation.status) ? "CONFIRMED · PAY AT FACILITY" : reservation.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {["confirmed", "paid"].includes(reservation.status) && <div style={{ margin: "0 16px 16px", padding: 20, background: "#fff", borderRadius: 20, textAlign: "center" }}>
        <div style={{ fontWeight: 800, color: "var(--bg-dark)", fontSize: 16 }}>Your entry pass</div>
        <canvas ref={qrCanvasRef} width={200} height={200} aria-label="Reservation QR code" style={{ width: 200, height: 200, marginTop: 12, imageRendering: "pixelated" }} />
        <div style={{ color: "#52645e", fontSize: 13, lineHeight: 1.5 }}>Show this booking QR to the parking facility attendant. They will scan it to check you in and start your session.</div>
        <div style={{ fontFamily: "monospace", letterSpacing: 2, fontWeight: 800, color: "var(--bg-dark)", marginTop: 10 }}>{reservation.bookingReference}</div>
      </div>}

      {/* Timer */}
      <div style={{ textAlign: "center", padding: "32px 24px 24px" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 600, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>
          {reservation.status === "active" ? (isExpired ? "Session expired" : "Time remaining") : "Reservation window"}
        </div>
        <div style={{
          fontSize: 64, fontWeight: 800, fontFamily: "monospace",
          color: isExpired ? "var(--orange)" : "var(--mint)",
          letterSpacing: 2, lineHeight: 1,
          textShadow: `0 0 40px ${isExpired ? "rgba(255,140,66,.4)" : "rgba(61,220,151,.4)"}`,
        }}>
          {countdown}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", marginTop: 12 }}>
          Until {fmtTime(reservation.end)} · {fmtDate(reservation.end)}
        </div>
      </div>

      {/* Lot info card */}
      <div style={{ margin: "0 16px" }}>
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 20, padding: "18px 20px", border: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>🅿️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{lot?.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{lot?.address}</div>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "14px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Start", fmtTime(reservation.startedAt || reservation.start)],
              ["End", fmtTime(reservation.end)],
              ["Duration", `${reservation.durationHours}h`],
              ["Elapsed", reservation.status === "active" ? fmtDuration(reservation.startedAt || reservation.start, new Date()) : "Not started"],
              ["Vehicle", reservation.vehicle?.plate || "—"],
              ["Estimated fee", `₹${Number(reservation.amount || 0).toFixed(0)}`],
              ["Space", "Assigned at facility"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: .5, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 3 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reservation.status === "active" && <div style={{ margin: "16px 16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}><span>Session progress</span><span>{reservation.durationHours}h total</span></div><div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 3, overflow: "hidden" }}>{(() => { const start = new Date(reservation.start).getTime(); const end = new Date(reservation.end).getTime(); const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100)); return <div style={{ height: "100%", width: `${pct}%`, background: "var(--mint)", borderRadius: 3 }} />; })()}</div></div>}
      <div style={{ padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        {reservation.status === "active" && <>
          <button onClick={handleExtend} disabled={extending} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px", borderRadius: 99, border: "2px solid rgba(61,220,151,.4)", background: "transparent", color: "var(--mint)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", opacity: extending ? .7 : 1 }}>{extending ? "Extending…" : "⏱ Extend 1 hour"}</button>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.55)", fontSize: 13, padding: "4px 12px" }}>Ask the facility attendant to check you out when you leave.</div>
        </>}
        <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }} onClick={() => navigate("/app")}>
          Back to map
        </button>
      </div>
    </div>
  );
}


