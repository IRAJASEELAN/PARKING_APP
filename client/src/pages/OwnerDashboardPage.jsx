import { useCallback, useEffect, useState } from "react";
import api from "../api.js";
import { CUR } from "../utils.js";
import ReservationScanner from "./ReservationScanner.jsx";

const INITIAL_DRAFT = { name: "", address: "", neighborhood: "", lat: "", lng: "", totalSpots: "", firstHour: "", additional: "", dailyMax: "", hours: "Open 24 hours" };
const TABS = ["Facilities", "Reservations", "Check-in"];

export default function OwnerDashboardPage() {
  const [tab, setTab] = useState("Facilities");
  const [organization, setOrganization] = useState(null);
  const [lots, setLots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [occupiedDrafts, setOccupiedDrafts] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [profile, facilityResult, reservationResult] = await Promise.all([
        api.get("/owner/profile"), api.get("/owner/facilities"), api.get("/owner/reservations"),
      ]);
      setOrganization(profile.data.organization);
      setLots(facilityResult.data.lots || []);
      setReservations(reservationResult.data.reservations || []);
      setOccupiedDrafts(Object.fromEntries((facilityResult.data.lots || []).map((lot) => [lot._id, String(lot.occupied)])));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not load your facility dashboard");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const refreshOnFocus = () => { if (!document.hidden) load(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [load]);

  async function refreshStatus() {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }

  async function submitFacility(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.post("/owner/facilities", {
        name: draft.name, address: draft.address, neighborhood: draft.neighborhood,
        geo: { type: "Point", coordinates: [Number(draft.lng), Number(draft.lat)] },
        totalSpots: Number(draft.totalSpots),
        rates: { firstHour: Number(draft.firstHour), additional: Number(draft.additional), dailyMax: Number(draft.dailyMax) },
        hours: draft.hours, vehicleTypes: ["car", "suv", "motorcycle", "van"],
      });
      setDraft(INITIAL_DRAFT); setShowForm(false); setNotice(data.message || "Facility sent for review"); await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not submit this facility"); }
    finally { setBusy(false); }
  }

  async function saveAvailability(lot) {
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.patch(`/owner/facilities/${lot._id}/availability`, { occupied: Number(occupiedDrafts[lot._id]) });
      setLots((current) => current.map((item) => item._id === lot._id ? data.lot : item));
      setNotice(`Availability updated for ${lot.name}`);
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not update facility availability"); }
    finally { setBusy(false); }
  }

  async function finishSession(reservation) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post(`/owner/reservations/${reservation._id}/check-out`);
      setNotice(`Session ended for ${reservation.lot?.name || "facility"}`);
      await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not check out this driver"); }
    finally { setBusy(false); }
  }

  async function recordPayment(reservation) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post(`/reservations/${reservation._id}/settle`);
      setNotice("Facility payment recorded");
      await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not record the facility payment"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="shell" style={{ display: "grid", placeItems: "center" }}><div className="spin" /></div>;

  return <div className="shell" style={{ background: "var(--bg)", overflowY: "auto" }}>
    <div className="status-bar dark"><span>ParkFlow · Facility owner</span><span>{organization?.status === "approved" ? "Verified account" : "Application review"}</span></div>
    <header style={{ background: "#fff", padding: "20px 20px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><h2 style={{ fontSize: 22, marginBottom: 4 }}>{organization?.name || "Owner dashboard"}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px" }}>Manage your locations, availability, and driver arrivals.</p></div>
        <button className="btn btn-outline" onClick={refreshStatus} disabled={refreshing} style={{ whiteSpace: "nowrap", padding: "9px 12px", marginBottom: 12 }}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
      </div>
      <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 12 }}>{TABS.map((item) => <button key={item} className={`chip${tab === item ? " active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div>
    </header>

    <div role="status" style={{ margin: 14, padding: 14, borderRadius: 12, background: organization?.status === "approved" ? "#eef7f2" : "#fff7e6", color: organization?.status === "approved" ? "#24533d" : "#754c00", lineHeight: 1.45 }}>
      <b>Owner account: {organization?.status || "pending"}</b>
      <div style={{ fontSize: 13, marginTop: 4 }}>{organization?.status === "approved" ? "Your owner application is approved. Each parking facility has a separate review before drivers can see or book it." : organization?.reviewNote || "ParkFlow will review your business details. Facilities stay hidden from drivers until approved."}</div>
      {organization?.status === "approved" && lots.some((lot) => lot.approvalStatus === "pending") && <div style={{ fontSize: 13, marginTop: 6 }}><b>Facility review still pending:</b> ask the administrator to open Admin → Facilities and approve this listing. Use Refresh after the admin approves it.</div>}
      {organization?.status === "approved" && lots.some((lot) => lot.approvalStatus === "rejected") && <div style={{ fontSize: 13, marginTop: 6 }}>A facility needs changes before it can be listed: {lots.filter((lot) => lot.approvalStatus === "rejected").map((lot) => lot.name).join(", ")}.</div>}
    </div>
    {error && <div role="alert" style={{ margin: 14, padding: 12, borderRadius: 10, color: "#a61d24", background: "#fff1f0" }}>{error}</div>}
    {notice && <div role="status" style={{ margin: 14, padding: 12, borderRadius: 10, color: "#24533d", background: "#eef7f2" }}>{notice}</div>}

    <main style={{ padding: 14, paddingBottom: 90 }}>
      {tab === "Facilities" && <>
        <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "＋ Submit a parking facility"}</button>
        {showForm && <form className="card" onSubmit={submitFacility} style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
          <input className="input" placeholder="Facility name" aria-label="Facility name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required maxLength={120} style={{ gridColumn: "1 / -1" }} />
          <input className="input" placeholder="Full street address" aria-label="Full street address" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} required minLength={5} maxLength={250} style={{ gridColumn: "1 / -1" }} />
          <input className="input" placeholder="Area / neighborhood" aria-label="Neighborhood" value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} maxLength={100} />
          <input className="input" placeholder="Opening hours" aria-label="Opening hours" value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} maxLength={80} />
          <input className="input" type="number" step="any" min="-90" max="90" placeholder="Latitude" aria-label="Latitude" value={draft.lat} onChange={(event) => setDraft({ ...draft, lat: event.target.value })} required />
          <input className="input" type="number" step="any" min="-180" max="180" placeholder="Longitude" aria-label="Longitude" value={draft.lng} onChange={(event) => setDraft({ ...draft, lng: event.target.value })} required />
          <input className="input" type="number" min="1" max="100000" placeholder="Total spaces" aria-label="Total spaces" value={draft.totalSpots} onChange={(event) => setDraft({ ...draft, totalSpots: event.target.value })} required />
          <input className="input" type="number" min="0" step="any" placeholder="First hour ₹" aria-label="First hour rate" value={draft.firstHour} onChange={(event) => setDraft({ ...draft, firstHour: event.target.value })} required />
          <input className="input" type="number" min="0" step="any" placeholder="Additional hour ₹" aria-label="Additional hour rate" value={draft.additional} onChange={(event) => setDraft({ ...draft, additional: event.target.value })} required />
          <input className="input" type="number" min="0" step="any" placeholder="Daily maximum ₹" aria-label="Daily maximum" value={draft.dailyMax} onChange={(event) => setDraft({ ...draft, dailyMax: event.target.value })} required />
          <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 12, color: "var(--text-muted)" }}>New facilities are reviewed before drivers can see or book them.</p>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ gridColumn: "1 / -1" }}>{busy ? "Submitting…" : "Submit for review"}</button>
        </form>}
        {!lots.length && <div className="card" style={{ padding: 18, color: "var(--text-muted)" }}>No facilities submitted yet. Add your first parking location to get started.</div>}
        <div style={{ display: "grid", gap: 10 }}>{lots.map((lot) => <section className="card" key={lot._id} style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><b>{lot.name}</b><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{lot.address}</div><div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{lot.approvalStatus === "approved" ? "Approved · visible to drivers" : lot.approvalStatus === "rejected" ? "Needs updates before it can be listed" : "Waiting for facility listing approval"}</div></div><span className="chip" style={{ alignSelf: "flex-start" }}>{lot.approvalStatus || "approved"}</span></div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{lot.occupied}/{lot.totalSpots} occupied · {CUR}{lot.rates?.hourly}/hr{lot.approvalNote ? ` · ${lot.approvalNote}` : ""}</div>
          {lot.approvalStatus === "approved" && <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}><label htmlFor={`occupied-${lot._id}`} style={{ fontSize: 12, color: "var(--text-muted)" }}>Occupied now</label><input id={`occupied-${lot._id}`} className="input" type="number" min="0" max={lot.totalSpots} value={occupiedDrafts[lot._id] ?? lot.occupied} onChange={(event) => setOccupiedDrafts((current) => ({ ...current, [lot._id]: event.target.value }))} style={{ width: 100 }} /><button className="btn btn-outline" disabled={busy} onClick={() => saveAvailability(lot)}>Update spaces</button></div>}
        </section>)}</div>
      </>}
      {tab === "Reservations" && <div style={{ display: "grid", gap: 9 }}>{reservations.length ? reservations.map((item) => <section className="card" key={item._id} style={{ padding: 14 }}><b>{item.lot?.name || "Facility"} · {item.status}</b><div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>{item.user?.name || "Driver"} · {item.vehicle?.plate || "Vehicle not listed"}</div><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>{new Date(item.start).toLocaleString()} – {new Date(item.end).toLocaleTimeString()}</div><div style={{ marginTop: 5, fontSize: 13 }}>{item.checkedInAt ? `Checked in ${new Date(item.checkedInAt).toLocaleTimeString()}` : "Awaiting arrival"} · {CUR}{Number(item.amount || 0).toFixed(2)} {item.payment?.status === "paid_at_facility" ? "· Paid on site" : "· Due at facility"}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{item.status === "active" && <button className="btn btn-primary" disabled={busy} onClick={() => finishSession(item)}>Check out driver</button>}{item.payment?.status !== "paid_at_facility" && ["active", "completed"].includes(item.status) && <button className="btn btn-outline" disabled={busy} onClick={() => recordPayment(item)}>Record on-site payment</button>}</div></section>) : <div className="card" style={{ padding: 18, color: "var(--text-muted)" }}>Reservations for your approved facilities will appear here.</div>}</div>}
      {tab === "Check-in" && <ReservationScanner />}
    </main>
  </div>;
}
