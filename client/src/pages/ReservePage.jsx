import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useSearch } from "../SearchContext.jsx";
import { fmtDate, fmtTime, CUR } from "../utils.js";

const DURATION_OPTIONS = [1, 2, 3, 4, 6, 8];
function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ReservePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { setCheckout, setDestination, setFilters } = useSearch();
  const [lot, setLot] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({ plate: "", make: "" });
  const [error, setError] = useState("");
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const [arrivalDate, setArrivalDate] = useState(localDate(now));
  const [arrivalTime, setArrivalTime] = useState(now.toTimeString().slice(0, 5));
  const [duration, setDuration] = useState(2);
  const [vehicleIdx, setVehicleIdx] = useState(0);
  const vehicles = user?.vehicles || [];
  const vehicle = vehicles[vehicleIdx];

  useEffect(() => {
    let active = true;
    api.get(`/lots/${id}`).then((response) => { if (active) setLot(response.data); })
      .catch((requestError) => { if (active) { setError(requestError?.response?.data?.message || "Could not load this facility."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    setQuoteLoading(true);
    api.get(`/lots/${id}/quote`, { params: { hours: duration } })
      .then(({ data }) => { if (active) setQuote(data.quote); })
      .catch(() => { if (active) setQuote(null); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [id, duration]);

  async function handleHold() {
    setError("");
    if (!vehicle) { setError("Add a vehicle to your profile before reserving."); return; }
    setSubmitting(true);
    try {
      const startIso = new Date(`${arrivalDate}T${arrivalTime}`).toISOString();
      const { data } = await api.post("/reservations", { lotId: id, start: startIso, durationHours: duration, vehicle });
      setCheckout(data);
      navigate("/app/checkout");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not hold space. Please check availability and try again.");
    } finally { setSubmitting(false); }
  }

  async function saveVehicleForBooking() {
    setError("");
    setVehicleSaving(true);
    try {
      const vehiclesToSave = [...vehicles, { plate: vehicleDraft.plate.trim().toUpperCase(), make: vehicleDraft.make.trim() }];
      const { data } = await api.patch("/users/me", { vehicles: vehiclesToSave });
      setUser(data);
      setVehicleIdx(data.vehicles.length - 1);
      setVehicleDraft({ plate: "", make: "" });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not save this vehicle. Check its registration and try again.");
    } finally { setVehicleSaving(false); }
  }

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}><div className="spin" /></div>;
  if (!lot) return <div className="shell" style={{ padding: 24 }}><p>{error || "Parking facility not found."}</p><button className="btn btn-outline" onClick={() => navigate(-1)}>Go back</button></div>;
  if (!lot.reservable) {
    const [lng, lat] = lot.geo.coordinates;
    return <div className="shell" style={{ background: "#fff", padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 42 }}>🅿️</div>
      <h2 style={{ margin: 0 }}>Booking isn’t available here yet</h2>
      <p style={{ color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{lot.name} is a map-listed facility without a connected ParkFlow booking inventory. Find nearby facilities where spaces can be reserved.</p>
      <button className="btn btn-primary" onClick={() => { setDestination({ label: lot.name, query: lot.name, lat, lng }); setFilters((previous) => ({ ...previous, availableNow: true, reservable: true })); navigate("/app/results"); }}>Find bookable nearby</button>
      <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
    </div>;
  }
  const minDate = localDate(new Date());
  const total = quote?.total;
  const endStr = fmtTime(new Date(new Date(`${arrivalDate}T${arrivalTime}`).getTime() + duration * 3600000));

  return (
    <div className="shell" style={{ background: "#fff" }}>
      <div className="status-bar dark"><span>ParkFlow</span><span>{lot.available ?? Math.max(0, lot.totalSpots - lot.occupied)} spaces free</span></div>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <div><h3 style={{ fontSize: 18 }}>Reserve a space</h3><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{lot.name}</div></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 140px" }}>
        {error && <div role="alert" style={{ background: "#FFF1F0", border: "1px solid #FFB3AE", borderRadius: 12, padding: "12px 16px", color: "#CF1322", fontSize: 14, marginBottom: 16 }}>{error}</div>}
        {lot.isDemoData && <div role="status" style={{ background: "#EEF7F2", border: "1px solid #C9E8D8", borderRadius: 12, padding: "12px 16px", color: "#24533D", fontSize: 13, lineHeight: 1.45, marginBottom: 16 }}>Reserve and pay online to secure your guaranteed parking space and instant QR entry pass.</div>}
        {(lot.available ?? Math.max(0, lot.totalSpots - lot.occupied)) < 1 && <div role="status" style={{ background: "#fff7e6", borderRadius: 12, padding: 12, marginBottom: 16, color: "#8c5b00" }}>This facility is currently full. You can still check another arrival time.</div>}
        <Section title="Arrival"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="field"><label htmlFor="arrival-date">Date</label><input id="arrival-date" className="input" type="date" value={arrivalDate} min={minDate} onChange={(event) => setArrivalDate(event.target.value)} /></div><div className="field"><label htmlFor="arrival-time">Time</label><input id="arrival-time" className="input" type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} /></div></div></Section>
        <Section title="Duration"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{DURATION_OPTIONS.map((hours) => <button key={hours} className={`chip${duration === hours ? " active" : ""}`} onClick={() => setDuration(hours)} style={{ minWidth: 52 }}>{hours}h</button>)}</div><div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>Until approximately <b>{endStr}</b></div></Section>
        <Section title="Vehicle">
          {vehicles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vehicles.map((item, index) => (
                <button key={item.plate} type="button" onClick={() => setVehicleIdx(index)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 14, border: vehicleIdx === index ? "2px solid var(--mint)" : "2px solid var(--border)", background: vehicleIdx === index ? "var(--mint-light)" : "var(--bg)", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 22 }}>🚗</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 600 }}>{item.make || "Vehicle"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.plate}</div>
                  </div>
                  {vehicleIdx === index && <span aria-label="Selected">✓</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Add your vehicle here to continue booking. It will be saved to your account.</p>
              <input className="input" value={vehicleDraft.make} onChange={(event) => setVehicleDraft((current) => ({ ...current, make: event.target.value }))} maxLength={60} placeholder="Make and model (optional)" aria-label="Vehicle make and model" />
              <input className="input" value={vehicleDraft.plate} onChange={(event) => setVehicleDraft((current) => ({ ...current, plate: event.target.value.toUpperCase() }))} maxLength={15} placeholder="Vehicle registration" aria-label="Vehicle registration" autoComplete="off" />
              <button type="button" className="btn btn-outline" disabled={vehicleSaving || vehicleDraft.plate.trim().length < 3} onClick={saveVehicleForBooking}>{vehicleSaving ? "Saving vehicle…" : "Save vehicle and continue"}</button>
            </div>
          )}
        </Section>
        <div className="card" style={{ padding: 18 }}><div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{lot.isDemoData ? "Sample price estimate" : "Price estimate"}</div>{quote ? <><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "var(--text-muted)" }}>Parking fee</span><span>{CUR}{quote.parkingFee.toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "var(--text-muted)" }}>Service fee</span><span>{CUR}{quote.serviceFee.toFixed(2)}</span></div><div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} /><div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18 }}><span>Total</span><span>{CUR}{quote.total.toFixed(2)}</span></div></> : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{quoteLoading ? "Updating quote…" : "Price quote unavailable. Please retry."}</span>}</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.5 }}>ParkFlow holds your space for 10 minutes while you complete checkout and payment. Your instant QR entry pass will be generated upon payment.</p>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "16px 20px", background: "#fff", borderTop: "1px solid var(--border)", zIndex: 20 }}><button className="btn btn-primary" style={{ fontSize: 16, fontWeight: 700 }} onClick={handleHold} disabled={submitting || quoteLoading || !quote || !vehicle || (lot.available ?? Math.max(0, lot.totalSpots - lot.occupied)) < 1}>{submitting ? "Holding space…" : `Hold space · ${CUR}${Number(total || 0).toFixed(2)}`}</button></div>
    </div>
  );
}

function Section({ title, children }) { return <div style={{ marginBottom: 24 }}><div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "var(--text)" }}>{title}</div>{children}</div>; }
