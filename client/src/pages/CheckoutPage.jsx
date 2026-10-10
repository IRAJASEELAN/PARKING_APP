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

  async function confirmReservation() {
    setError("");
    setLoading(true);
    try {
      await api.post(`/reservations/${reservation._id}/confirm`);
      setCheckout(null);
      navigate(`/app/reservation/${reservation._id}`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not confirm this reservation. Your temporary hold may expire soon.");
    } finally { setLoading(false); }
  }

  return <div className="shell" style={{ background: "var(--bg)" }}><div className="status-bar dark"><span>ParkFlow</span><span>Reservation review</span></div><div className="page-header" style={{ background: "#fff" }}><button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button><h3 style={{ fontSize: 18 }}>Review reservation</h3></div><div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 150px" }}>{error && <div role="alert" style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14, marginBottom: 12 }}>{error}</div>}<div className="card" style={{ padding: 20 }}><div style={{ fontWeight: 700, fontSize: 17 }}>{lot?.name}</div><div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{lot?.address}</div><div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />{[["Date", fmtDate(reservation.start)], ["Arrival", fmtTime(reservation.start)], ["Duration", `${reservation.durationHours} hour${reservation.durationHours === 1 ? "" : "s"}`], ["Vehicle", reservation.vehicle?.make ? `${reservation.vehicle.make} · ${reservation.vehicle.plate}` : reservation.vehicle?.plate || "Saved vehicle"]].map(([label, value]) => <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12 }}><span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span><span style={{ fontWeight: 600, fontSize: 14, textAlign: "right" }}>{value}</span></div>)}<div style={{ height: 1, background: "var(--border)", margin: "4px 0 12px" }} /><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "var(--text-muted)" }}>Parking fee</span><span>{CUR}{parkingFee.toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "var(--text-muted)" }}>Service fee</span><span>{CUR}{serviceFee.toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 800, fontSize: 18 }}><span>Due at facility</span><span>{CUR}{total.toFixed(2)}</span></div></div><div className="card" style={{ marginTop: 14, padding: 16 }}><div style={{ fontWeight: 700 }}>Pay at the parking facility</div><p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>ParkFlow does not collect payment. Pay the facility directly when you arrive. Your reservation and QR code confirm your space; payment is due on site.</p></div></div><div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "16px 20px", background: "#fff", borderTop: "1px solid var(--border)", zIndex: 20 }}><button className="btn btn-primary" style={{ fontSize: 16, fontWeight: 700 }} onClick={confirmReservation} disabled={loading}>{loading ? "Confirming…" : `Reserve space · ${CUR}${total.toFixed(2)} due on site`}</button><div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>No online payment · Pay when you arrive</div></div></div>;
}