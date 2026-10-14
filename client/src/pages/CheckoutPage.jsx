import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { useSearch } from "../SearchContext.jsx";
import { fmtDate, fmtTime, CUR } from "../utils.js";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { checkout, setCheckout } = useSearch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!checkout) { navigate("/app"); return null; }
  const reservation = checkout;
  const lot = reservation.lot;
  const breakdown = reservation.priceBreakdown;
  const parkingFee = Number(breakdown?.parkingFee ?? reservation.amount ?? 0);
  const serviceFee = Number(breakdown?.serviceFee ?? 15);
  const total = Number(breakdown?.total ?? parkingFee + serviceFee);

  async function proceedToPayment() {
    setError("");
    setLoading(true);
    try {
      // Step 1: confirm the held reservation (held → confirmed)
      const { data } = await api.post(`/reservations/${reservation._id}/confirm`);
      setCheckout(null);
      // Step 2: go to the payment page
      navigate(`/app/payment/${data._id}`, { state: { amount: total, lotName: lot?.name } });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not confirm this reservation. Your temporary hold may expire soon.");
    } finally { setLoading(false); }
  }

  return (
    <div className="shell" style={{ background: "var(--bg)" }}>
      <div className="status-bar dark"><span>ParkFlow</span><span>Review booking</span></div>

      <div className="page-header" style={{ background: "#fff" }}>
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h3 style={{ fontSize: 18 }}>Review & Pay</h3>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 150px" }}>
        {error && <div role="alert" style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14, marginBottom: 12 }}>{error}</div>}

        {/* Booking summary card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{lot?.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{lot?.address}</div>
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
          {[
            ["Date",     fmtDate(reservation.start)],
            ["Arrival",  fmtTime(reservation.start)],
            ["Duration", `${reservation.durationHours} hour${reservation.durationHours === 1 ? "" : "s"}`],
            ["Until",    fmtTime(reservation.end)],
            ["Vehicle",  reservation.vehicle?.make ? `${reservation.vehicle.make} · ${reservation.vehicle.plate}` : reservation.vehicle?.plate || "Saved vehicle"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 14, textAlign: "right" }}>{value}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0 12px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "var(--text-muted)" }}>Parking fee</span>
            <span>{CUR}{parkingFee.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "var(--text-muted)" }}>Service fee</span>
            <span>{CUR}{serviceFee.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 800, fontSize: 20 }}>
            <span>Total</span>
            <span style={{ color: "var(--bg-dark)" }}>{CUR}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment info banner */}
        <div className="card" style={{ marginTop: 14, padding: 16, background: "var(--mint-light)", border: "1px solid var(--mint-mid)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--bg-dark)" }}>Secure online payment</div>
              <p style={{ margin: "4px 0 0", color: "var(--bg-dark)", fontSize: 13, lineHeight: 1.5, opacity: 0.75 }}>
                Pay now to confirm your space. Your QR entry pass is generated instantly after payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "16px 20px", background: "#fff", borderTop: "1px solid var(--border)", zIndex: 20 }}>
        <button
          className="btn btn-primary"
          style={{ fontSize: 16, fontWeight: 700 }}
          onClick={proceedToPayment}
          disabled={loading}
        >
          {loading ? "Confirming reservation…" : `Proceed to Payment · ${CUR}${total.toFixed(2)}`}
        </button>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          🔒 Secured · Cancellable before check-in
        </div>
      </div>
    </div>
  );
}