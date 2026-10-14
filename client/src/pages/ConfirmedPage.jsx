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
    QRCode.toCanvas(canvasRef.current, reservation.qrPayload, {
      width: 220, margin: 1, errorCorrectionLevel: "M",
      color: { dark: "#0F1F1A", light: "#FFFFFF" },
    }).catch(() => {});
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
  const isPaid = reservation.payment?.status === "paid_online";
  const amountLabel = isPaid ? "Amount Paid" : "Due at Facility";
  const transactionId = reservation.payment?.transactionId;

  return (
    <div className="shell" style={{ background: "var(--bg)", overflowY: "auto" }}>
      {/* ── Header banner ── */}
      <div style={{
        background: "var(--bg-dark)",
        padding: "48px 24px 40px",
        textAlign: "center",
        borderRadius: "0 0 32px 32px",
        position: "relative",
      }}>
        <div className="status-bar light" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div>
        </div>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: "#fff", fontSize: 26 }}>
          {isPaid ? "Payment Confirmed!" : "Reservation Confirmed!"}
        </h2>
        <p style={{ color: "rgba(255,255,255,.65)", fontSize: 15, marginTop: 8 }}>
          {isPaid
            ? "Payment successful. Show this QR at the parking entrance."
            : "Show this QR code at the entrance when you arrive."}
        </p>
        {isPaid && transactionId && (
          <div style={{ marginTop: 10, background: "rgba(61,220,151,.15)", borderRadius: 12, padding: "6px 14px", display: "inline-block" }}>
            <span style={{ color: "var(--mint)", fontSize: 12, fontFamily: "monospace" }}>TXN: {transactionId}</span>
          </div>
        )}
      </div>

      <div style={{ padding: "24px 20px 100px" }}>
        {/* ── QR code card ── */}
        <div className="card" style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>
            Entry Pass · Scan at Gate
          </div>
          <canvas
            ref={canvasRef}
            width={220}
            height={220}
            style={{ borderRadius: 12, imageRendering: "pixelated", width: 220, height: 220, border: "4px solid var(--mint-light)" }}
          />
          <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "var(--text)" }}>
            {reservation.bookingReference || "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Booking Reference</div>
        </div>

        {/* ── Bill / Receipt card ── */}
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Receipt</div>
            {isPaid && <span style={{ background: "var(--mint-light)", color: "var(--bg-dark)", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "3px 10px" }}>PAID ✓</span>}
          </div>
          {[
            ["📍 Location",  lot?.name],
            ["📅 Date",      fmtDate(reservation.start)],
            ["🕐 Arrival",   fmtTime(reservation.start)],
            ["🏁 Until",     fmtTime(reservation.end)],
            ["⏱ Duration",  `${reservation.durationHours} hr`],
            ["🚗 Vehicle",   reservation.vehicle?.make ? `${reservation.vehicle.make} · ${reservation.vehicle.plate}` : reservation.vehicle?.plate || "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 14, maxWidth: 180, textAlign: "right" }}>{value}</span>
            </div>
          ))}

          <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />

          {/* Price breakdown */}
          {[
            ["Parking fee",  `${CUR}${Number(reservation.priceBreakdown?.parkingFee ?? 0).toFixed(2)}`],
            ["Service fee",  `${CUR}${Number(reservation.priceBreakdown?.serviceFee ?? 0).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize: 14 }}>{value}</span>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontWeight: 800, fontSize: 18, color: "var(--bg-dark)" }}>
            <span>{amountLabel}</span>
            <span>{CUR}{Number(reservation.amount || 0).toFixed(2)}</span>
          </div>

          {isPaid && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
              Paid online · {new Date(reservation.payment?.settledAt).toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {/* ── Status note ── */}
        <div style={{ textAlign: "center", marginTop: 16, padding: "12px", background: isPaid ? "var(--mint-light)" : "#FFF7E6", borderRadius: 14, border: `1px solid ${isPaid ? "var(--mint-mid)" : "#FFD591"}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isPaid ? "var(--bg-dark)" : "#874D00" }}>
            {isPaid
              ? "✅ Payment verified · Present this QR at the parking entrance"
              : "⏳ Your space is held · Pay at the facility when you arrive"}
          </span>
        </div>

        {/* ── CTA buttons ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              const [lng, lat] = lot.geo.coordinates;
              navigate(directionsPath({ lat, lng, name: lot.name, address: lot.address }));
            }}
          >
            🗺 Get Directions to Parking
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/app/session/${reservation._id}`)}
          >
            🎫 View Live QR Pass
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
