import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import QRCode from "qrcode";
import { fmtDate, fmtTime, CUR } from "../utils.js";
import { directionsPath } from "../utils/directions.js";

export default function ConfirmedPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get(`/reservations/${id}`)
      .then((r) => setReservation(r.data))
      .catch(() => navigate("/app"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!reservation?.qrPayload || !canvasRef.current) return;
    // Render a standards-compliant QR code for backend verification
    QRCode.toCanvas(canvasRef.current, reservation.qrPayload, { width: 200, margin: 1, errorCorrectionLevel: "M" }).catch(() => {});
  }, [reservation]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div className="spin" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--mint)", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!reservation) return null;

  const lot = reservation.lot;

  return (
    <div className="shell" style={{ background: "var(--bg)", overflowY: "auto" }}>
      {/* Header banner */}
      <div style={{
        background: "var(--bg-dark)",
        padding: "48px 24px 40px",
        textAlign: "center",
        borderRadius: "0 0 32px 32px",
      }}>
        <div className="status-bar light" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div>
        </div>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: "#fff", fontSize: 26 }}>Reservation confirmed!</h2>
        <p style={{ color: "rgba(255,255,255,.65)", fontSize: 15, marginTop: 8 }}>
          Show this QR code at the entrance. Pay the facility directly when you arrive.
        </p>
      </div>

      <div style={{ padding: "24px 20px 100px" }}>
        {/* QR code card */}
        <div className="card" style={{ padding: "28px 24px", textAlign: "center" }}>
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            style={{ borderRadius: 12, imageRendering: "pixelated", width: 200, height: 200 }}
          />
          <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: "var(--text)" }}>
            {reservation.bookingReference || "Booking reference unavailable"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Booking reference
          </div>
        </div>

        {/* Booking details */}
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Booking details</div>
          {[
            ["📍 Location", lot?.name],
            ["📅 Date", fmtDate(reservation.start)],
            ["🕐 Arrival", fmtTime(reservation.start)],
            ["🏁 Until", fmtTime(reservation.end)],
            ["🚗 Vehicle", reservation.vehicle?.make ? `${reservation.vehicle.make} · ${reservation.vehicle.plate}` : reservation.vehicle?.plate || "Vehicle not specified"],
            ["Due at facility", `${CUR}${Number(reservation.amount || 0).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 14, maxWidth: 200, textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div style={{ textAlign: "center", marginTop: 16, padding: "12px", background: "var(--mint-light)", borderRadius: 14, border: "1px solid var(--mint-mid)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bg-dark)" }}>
            Payment is collected by the facility on arrival. Live availability depends on its occupancy feed.
          </span>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          <button
            className="btn btn-primary"
            onClick={() => { const [lng, lat] = lot.geo.coordinates; navigate(directionsPath({ lat, lng, name: lot.name, address: lot.address })); }}
          >
            🗺 Directions in ParkFlow
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/app/session/${reservation._id}`)}
          >
            View booking QR
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/app")}
            style={{ color: "var(--text-muted)" }}
          >
            Back to map
          </button>
        </div>
      </div>
    </div>
  );
}


