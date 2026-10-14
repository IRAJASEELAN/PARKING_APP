import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import { CUR } from "../utils.js";

/* ── Card number formatter: adds a space every 4 digits ── */
function formatCardNumber(value) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/* ── Animated success tick ── */
function SuccessTick() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="36" fill="#3DDC97" fillOpacity="0.15" />
      <circle cx="36" cy="36" r="28" fill="#3DDC97" fillOpacity="0.25" />
      <circle cx="36" cy="36" r="20" fill="#3DDC97" />
      <path d="M25 36l8 8 14-16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("card"); // card | upi | netbanking
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  // UPI field
  const [upiId, setUpiId] = useState("");
  // Net banking
  const [bank, setBank] = useState("SBI");

  useEffect(() => {
    api.get(`/reservations/${id}`)
      .then(({ data }) => setReservation(data))
      .catch(() => navigate("/app"))
      .finally(() => setLoading(false));
  }, [id]);

  function isCardValid() {
    return cardNumber.replace(/\s/g, "").length === 16 && cardName.trim().length > 1 && expiry.length === 5 && cvv.length >= 3;
  }
  function isUpiValid() { return /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim()); }
  function isFormValid() {
    if (method === "card") return isCardValid();
    if (method === "upi") return isUpiValid();
    return true; // net banking — bank already selected
  }

  async function handlePay(e) {
    e.preventDefault();
    if (!isFormValid()) { setError("Please fill in all payment details correctly."); return; }
    setError("");
    setPaying(true);
    try {
      // Simulate 1.5s payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await api.post(`/reservations/${id}/pay`);
      setSuccess(true);
      // Navigate to confirmed page after 2.5s
      setTimeout(() => navigate(`/app/reservation/${id}`), 2500);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Payment could not be processed. Please try again.");
    } finally { setPaying(false); }
  }

  if (loading) return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div className="spin" />
    </div>
  );

  if (!reservation) return null;

  const total = Number(reservation.priceBreakdown?.total ?? reservation.amount ?? 0);
  const lot = reservation.lot;

  /* ── Payment success screen ── */
  if (success) return (
    <div className="shell" style={{ background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <SuccessTick />
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--bg-dark)", marginTop: 8 }}>Payment Successful!</h2>
      <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>
        {CUR}{total.toFixed(2)} paid · Generating your QR pass…
      </p>
      <div className="spin" style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--mint)", borderRadius: "50%" }} />
    </div>
  );

  return (
    <div className="shell" style={{ background: "#f8faf9" }}>
      <div className="status-bar dark"><span>ParkFlow · Secure Checkout</span><span>🔒</span></div>

      <div className="page-header" style={{ background: "#fff" }}>
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h3 style={{ fontSize: 18 }}>Secure Payment</h3>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 160px" }}>
        {/* Amount banner */}
        <div style={{ background: "var(--bg-dark)", borderRadius: 20, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13 }}>Amount due</div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 800, marginTop: 4 }}>{CUR}{total.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--mint)", fontSize: 13, fontWeight: 700 }}>🅿️ {lot?.name}</div>
            <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11, marginTop: 3 }}>#{reservation.bookingReference}</div>
          </div>
        </div>

        {/* Payment method tabs */}
        <div style={{ display: "flex", background: "#fff", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 16 }}>
          {[["card", "💳 Card"], ["upi", "UPI"], ["netbanking", "Net Banking"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMethod(key); setError(""); }}
              style={{
                flex: 1, padding: "12px 4px", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
                background: method === key ? "var(--bg-dark)" : "transparent",
                color: method === key ? "#fff" : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div role="alert" style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14, marginBottom: 14 }}>{error}</div>}

        <form onSubmit={handlePay}>
          {/* ── Card Form ── */}
          {method === "card" && (
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Card Number</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  autoComplete="cc-number"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Name on Card</label>
                <input
                  className="input"
                  placeholder="RAHUL SHARMA"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  autoComplete="cc-name"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Expiry (MM/YY)</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    autoComplete="cc-exp"
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>CVV</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="•••"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    autoComplete="cc-csc"
                  />
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 10, padding: "8px 12px" }}>
                🔒 This is a demo prototype. No real card data is collected or stored.
              </div>
            </div>
          )}

          {/* ── UPI Form ── */}
          {method === "upi" && (
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>UPI ID</label>
                <input
                  className="input"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["@okaxis", "@ybl", "@ibl", "@paytm"].map((suffix) => (
                  <button
                    key={suffix}
                    type="button"
                    className="chip"
                    onClick={() => setUpiId((prev) => prev.split("@")[0] + suffix)}
                    style={{ fontSize: 12 }}
                  >
                    {suffix}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 10, padding: "8px 12px" }}>
                🔒 Demo prototype only. No real UPI transaction is initiated.
              </div>
            </div>
          )}

          {/* ── Net Banking Form ── */}
          {method === "netbanking" && (
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Select your bank</label>
                <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {["SBI", "HDFC", "ICICI", "Axis Bank", "Kotak", "Canara Bank", "Bank of Baroda", "Punjab National Bank", "IDFC First", "Yes Bank"].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 10, padding: "8px 12px" }}>
                🔒 Demo prototype only. No real net banking session is initiated.
              </div>
            </div>
          )}

          {/* ── Sticky pay button ── */}
          <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "16px 20px", background: "#fff", borderTop: "1px solid var(--border)", zIndex: 20 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ fontSize: 16, fontWeight: 700, opacity: (paying || !isFormValid()) ? 0.75 : 1 }}
              disabled={paying || !isFormValid()}
            >
              {paying ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span className="spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                  Processing payment…
                </span>
              ) : `Pay ${CUR}${total.toFixed(2)} Now`}
            </button>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
              🔒 256-bit encrypted · Demo prototype
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
