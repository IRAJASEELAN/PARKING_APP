import { useEffect, useState } from "react";
import api from "../api.js";
import { CUR } from "../utils.js";
import ReservationScanner from "./ReservationScanner.jsx";

const TABS = ["Overview", "Facilities", "Slots", "Reservations", "Users", "Analytics"];
const SLOT_STATES = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];
export default function AdminDashboardPage() {
  const [tab, setTab] = useState("Overview");
  const [metrics, setMetrics] = useState(null);
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [slotLot, setSlotLot] = useState("");
  const [slotNumber, setSlotNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [facilityDraft, setFacilityDraft] = useState({ name: "", address: "", neighborhood: "", lat: "", lng: "", totalSpots: "", firstHour: "", additional: "", dailyMax: "", isDemoData: true });

  async function load() {
    setError("");
    try {
      if (tab === "Overview") setMetrics((await api.get("/admin/overview")).data.metrics);
      if (tab === "Facilities") setLots((await api.get("/admin/lots")).data.lots || []);
      if (tab === "Slots") {
        const [lotResult, slotResult] = await Promise.all([api.get("/admin/lots"), api.get("/admin/slots")]);
        setLots(lotResult.data.lots || []); setSlots(slotResult.data.slots || []);
      }
      if (tab === "Reservations") setReservations((await api.get("/admin/reservations")).data.reservations || []);
      if (tab === "Users") setUsers((await api.get("/admin/users")).data.users || []);
      if (tab === "Analytics") setAnalytics((await api.get("/analytics/overview")).data);
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not load dashboard data"); }
  }
  useEffect(() => { load(); }, [tab]);

  async function addFacility(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/admin/lots", {
        name: facilityDraft.name, address: facilityDraft.address, neighborhood: facilityDraft.neighborhood,
        geo: { type: "Point", coordinates: [Number(facilityDraft.lng), Number(facilityDraft.lat)] },
        totalSpots: Number(facilityDraft.totalSpots),
        rates: { firstHour: Number(facilityDraft.firstHour), additional: Number(facilityDraft.additional), dailyMax: Number(facilityDraft.dailyMax) },
        vehicleTypes: ["car", "suv", "motorcycle", "van"], amenities: [], isDemoData: facilityDraft.isDemoData,
      });
      setFacilityDraft({ name: "", address: "", neighborhood: "", lat: "", lng: "", totalSpots: "", firstHour: "", additional: "", dailyMax: "", isDemoData: true });
      setShowFacilityForm(false);
      await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not add facility"); }
    finally { setBusy(false); }
  }
  async function updateLot(lot, change) {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/lots/${lot._id}`, change);
      setLots((items) => items.map((item) => item._id === lot._id ? data.lot : item));
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not update facility"); }
    finally { setBusy(false); }
  }
  async function addSlot(event) {
    event.preventDefault(); setBusy(true);
    try { await api.post("/admin/slots", { lotId: slotLot || lots[0]?._id, slotNumber }); setSlotNumber(""); await load(); }
    catch (requestError) { setError(requestError?.response?.data?.message || "Could not add slot"); }
    finally { setBusy(false); }
  }
  async function updateSlot(slot, status) {
    try { const { data } = await api.patch(`/admin/slots/${slot._id}`, { status }); setSlots((items) => items.map((item) => item._id === slot._id ? data.slot : item)); }
    catch (requestError) { setError(requestError?.response?.data?.message || "Could not update slot"); }
  }

  return <div className="shell" style={{ background: "var(--bg)", overflowY: "auto" }}>
    <div className="status-bar dark"><span>ParkFlow Admin</span><span>Chennai</span></div>
    <header style={{ background: "#fff", padding: "18px 20px 0", borderBottom: "1px solid var(--border)" }}>
      <h2 style={{ fontSize: 22 }}>Operations dashboard</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "6px 0 14px" }}>Occupancy may be estimated · Revenue includes payments recorded by facility staff</p>
      <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 12 }}>{TABS.map((item) => <button key={item} className={`chip${tab === item ? " active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div>
    </header>
    {error && <div role="alert" style={{ margin: 16, padding: 12, borderRadius: 10, color: "#a61d24", background: "#fff1f0" }}>{error}</div>}
    <main style={{ padding: 16, paddingBottom: 90 }}>
      {tab === "Overview" && <>
        {metrics ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{[["Facilities",metrics.totalFacilities],["Spaces",metrics.totalSpaces],["Occupied",metrics.occupiedSpaces],["Available",metrics.availableSpaces],["Active reservations",metrics.activeReservations],["Today",metrics.todayReservations],["Collected on site",`${CUR}${metrics.revenue}`],["Occupancy",`${metrics.averageOccupancy}%`]].map(([label,value]) => <div className="card" key={label} style={{ padding: 16 }}><div style={{ color: "var(--text-muted)", fontSize: 12 }}>{label}</div><div style={{ fontWeight: 800, fontSize: 22, marginTop: 5 }}>{value}</div></div>)}</div> : <p>Loading dashboard…</p>}
      </>}
      {tab === "Facilities" && <>
        <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => setShowFacilityForm((shown) => !shown)}>{showFacilityForm ? "Close form" : "＋ Add facility"}</button>
        {showFacilityForm && <form className="card" onSubmit={addFacility} style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
          <input className="input" placeholder="Facility name" aria-label="Facility name" value={facilityDraft.name} onChange={(event) => setFacilityDraft({ ...facilityDraft, name: event.target.value })} required maxLength={120} style={{ gridColumn: "1 / -1" }} />
          <input className="input" placeholder="Street address" aria-label="Street address" value={facilityDraft.address} onChange={(event) => setFacilityDraft({ ...facilityDraft, address: event.target.value })} maxLength={250} style={{ gridColumn: "1 / -1" }} />
          <input className="input" placeholder="Area / neighborhood" aria-label="Area" value={facilityDraft.neighborhood} onChange={(event) => setFacilityDraft({ ...facilityDraft, neighborhood: event.target.value })} maxLength={100} />
          <input className="input" type="number" min="1" max="100000" placeholder="Total spaces" aria-label="Total spaces" value={facilityDraft.totalSpots} onChange={(event) => setFacilityDraft({ ...facilityDraft, totalSpots: event.target.value })} required />
          <input className="input" type="number" step="any" min="0" placeholder="Latitude" aria-label="Latitude" value={facilityDraft.lat} onChange={(event) => setFacilityDraft({ ...facilityDraft, lat: event.target.value })} required />
          <input className="input" type="number" step="any" min="0" placeholder="Longitude" aria-label="Longitude" value={facilityDraft.lng} onChange={(event) => setFacilityDraft({ ...facilityDraft, lng: event.target.value })} required />
          <input className="input" type="number" step="any" min="0" placeholder="First hour ₹" aria-label="First hour rate" value={facilityDraft.firstHour} onChange={(event) => setFacilityDraft({ ...facilityDraft, firstHour: event.target.value })} required />
          <input className="input" type="number" step="any" min="0" placeholder="Additional hour ₹" aria-label="Additional hour rate" value={facilityDraft.additional} onChange={(event) => setFacilityDraft({ ...facilityDraft, additional: event.target.value })} required />
          <input className="input" type="number" step="any" min="0" placeholder="Daily cap ₹" aria-label="Daily maximum rate" value={facilityDraft.dailyMax} onChange={(event) => setFacilityDraft({ ...facilityDraft, dailyMax: event.target.value })} required />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, gridColumn: "1 / -1" }}><input type="checkbox" checked={facilityDraft.isDemoData} onChange={(event) => setFacilityDraft({ ...facilityDraft, isDemoData: event.target.checked })} /> Mark as sample/demo data</label>
          <p style={{ gridColumn: "1 / -1", margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Uncheck only after you verify the facility details. Occupancy begins as unreported until an operator update arrives.</p>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ gridColumn: "1 / -1" }}>{busy ? "Saving…" : "Save facility"}</button>
        </form>}
        <div style={{ display: "grid", gap: 10 }}>{lots.map((lot) => <section className="card" key={lot._id} style={{ padding: 16 }}><b>{lot.name}</b><div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{lot.neighborhood} · {lot.occupied}/{lot.totalSpots} occupied · {CUR}{lot.rates?.hourly}/hr</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{lot.isDemoData ? "Sample listing" : "Operator listing"} · {lot.occupancySource || "occupancy unreported"}{lot.occupancyUpdatedAt ? ` · ${new Date(lot.occupancyUpdatedAt).toLocaleString()}` : ""}</div><div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button className="btn btn-outline" disabled={busy || lot.occupied <= 0} onClick={() => updateLot(lot,{occupied:lot.occupied-1})}>− Occupied</button><button className="btn btn-outline" disabled={busy || lot.occupied >= lot.totalSpots} onClick={() => updateLot(lot,{occupied:lot.occupied+1})}>+ Occupied</button><button className="btn btn-ghost" onClick={() => { const name=window.prompt("Facility name",lot.name); if(name?.trim()) updateLot(lot,{name:name.trim()}); }}>Edit name</button></div></section>)}</div>
      </>}      {tab === "Slots" && <>
        <form className="card" onSubmit={addSlot} style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}><select className="input" value={slotLot || lots[0]?._id || ""} onChange={(e)=>setSlotLot(e.target.value)} aria-label="Facility">{lots.map((lot)=><option key={lot._id} value={lot._id}>{lot.name}</option>)}</select><input className="input" placeholder="Slot number" value={slotNumber} onChange={(e)=>setSlotNumber(e.target.value)} required /><button className="btn btn-primary" disabled={busy || !lots.length}>Add slot</button></form>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{slots.map((slot)=><div className="card" key={slot._id} style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><b>{slot.slotNumber}</b><div style={{ color: "var(--text-muted)", fontSize: 12 }}>{slot.lotId?.name} · {slot.floor} {slot.section}</div></div><select value={slot.status} onChange={(e)=>updateSlot(slot,e.target.value)} aria-label={`Status for ${slot.slotNumber}`}>{SLOT_STATES.map((state)=><option key={state}>{state}</option>)}</select></div>)}</div>
      </>}
      {tab === "Reservations" && <><button className="btn btn-outline" style={{ marginBottom: 12 }} onClick={() => setShowScanner((value) => !value)}>{showScanner ? "Hide QR scanner" : "Scan reservation QR"}</button>{showScanner && <ReservationScanner />}<div style={{ display: "grid", gap: 8 }}>{reservations.map((item)=><div className="card" key={item._id} style={{ padding: 14 }}><b>{item.lot?.name || "Facility"}</b><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.user?.name} · {item.status} · {item.start ? new Date(item.start).toLocaleString() : ""}</div></div>)}</div></>}
      {tab === "Users" && <div style={{ display: "grid", gap: 8 }}>{users.map((item)=><div className="card" key={item._id} style={{ padding: 14 }}><b>{item.name || "Driver"}</b><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.email} · {item.role}</div></div>)}</div>}
      {tab === "Analytics" && analytics && <><p style={{ fontSize: 12, color: "var(--text-muted)" }}>Historical demo aggregates; this seed does not contain live sensor time series.</p><h3>Parking demand by area</h3>{analytics.demandByArea?.map((area)=><div key={area._id || "unknown"} className="card" style={{ marginTop: 8, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{area._id || "Area not set"}</b><span>{area.occupied}/{area.spaces}</span></div><div style={{ height: 8, background: "var(--border)", borderRadius: 8, marginTop: 8 }}><div style={{ width: `${area.spaces ? Math.min(100, area.occupied/area.spaces*100) : 0}%`, height: "100%", background: "var(--mint)", borderRadius: 8 }} /></div></div>)}</>}
      {tab === "Analytics" && !analytics && <p>Loading analytics…</p>}
      {tab !== "Overview" && tab !== "Facilities" && tab !== "Slots" && tab !== "Reservations" && tab !== "Users" && tab !== "Analytics" && <p>No dashboard section selected.</p>}
    </main>
  </div>;
}

