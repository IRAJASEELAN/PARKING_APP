import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { useSearch } from "../SearchContext.jsx";

export default function DestinationPage() {
  const navigate = useNavigate();
  const { destination, setDestination, useCurrentLocation } = useSearch();
  const [lots, setLots] = useState([]);
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [places, setPlaces] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => { api.get("/lots").then(({ data }) => setLots(data.lots || [])).catch(() => {}); }, []);
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (query ? lots.filter((lot) => `${lot.name} ${lot.address} ${lot.neighborhood}`.toLowerCase().includes(query)) : lots).slice(0, 8);
  }, [lots, q]);

  async function searchPlaces(event) {
    event.preventDefault();
    const query = q.trim();
    if (query.length < 3) { setSearchError("Enter at least 3 characters to search for a place."); return; }
    setSearching(true);
    setSearchError("");
    setPlaces([]);
    try {
      const { data } = await api.get("/geocode", { params: { q: query } });
      setPlaces(data.places || []);
      if (!data.places?.length) setSearchError(`No places found for “${query}”. Try a nearby landmark or area.`);
    } catch (error) {
      setSearchError(error?.response?.data?.message || "Place search is unavailable right now. Try again shortly.");
    } finally { setSearching(false); }
  }

  async function chooseCurrent() {
    setLocating(true);
    try { await useCurrentLocation(); navigate("/app/results"); }
    catch (error) { setSearchError(error.message); }
    finally { setLocating(false); }
  }

  function chooseLot(lot) {
    const [lng, lat] = lot.geo.coordinates;
    setDestination({ label: lot.name, query: lot.neighborhood || lot.name, lat, lng });
    navigate("/app/results");
  }

  function choosePlace(place) {
    setDestination({ label: place.label, query: q.trim(), lat: place.lat, lng: place.lng });
    navigate("/app/results");
  }

  return <div className="shell" style={{ background: "#fff" }}>
    <div className="status-bar dark"><span>ParkFlow</span><span>Search worldwide</span></div>
    <form onSubmit={searchPlaces} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" className="back-btn" onClick={() => navigate("/app")} aria-label="Back">←</button>
        <input className="input" placeholder="Search a place, address or landmark" value={q} onChange={(e) => { setQ(e.target.value); setPlaces([]); setSearchError(""); }} aria-label="Search destination" />
        <button className="btn btn-primary" type="submit" disabled={searching || q.trim().length < 3} style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{searching ? "Searching…" : "Search"}</button>
      </div>
    </form>
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <button className="btn btn-primary" onClick={chooseCurrent} disabled={locating}>{locating ? "Finding your location…" : "📍 Use my current location"}</button>
      <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => navigate("/app/destination/map")}>Select a point on the map</button>
      {places.length > 0 && <>
        <div className="section-title" style={{ marginTop: 24 }}>Places matching your search</div>
        {places.map((place) => <button key={place.id} onClick={() => choosePlace(place)} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 0", border: 0, borderBottom: "1px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ fontWeight: 700, color: "var(--text)" }}>📍 {place.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{place.displayName}</div>
          <div style={{ fontSize: 11, color: "var(--mint-dark, #1B7A4F)", marginTop: 4 }}>Find nearby parking →</div>
        </button>)}
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Place data © OpenStreetMap contributors</p>
      </>}
      {searchError && <p role="status" style={{ marginTop: 16, color: "var(--text-muted)" }}>{searchError}</p>}
      <div className="section-title" style={{ marginTop: 24 }}>{q ? "ParkFlow facilities matching your search" : "ParkFlow facilities"}</div>
      {matches.map((lot) => <button key={lot._id} onClick={() => chooseLot(lot)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 0", border: 0, borderBottom: "1px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ fontWeight: 700, color: "var(--text)" }}>{lot.name}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{lot.address || lot.neighborhood} · ParkFlow listing</div>
      </button>)}
      {q && !matches.length && <p style={{ color: "var(--text-muted)" }}>No ParkFlow facility matches yet. Use Search above to find this place on the map.</p>}
      <p style={{ marginTop: 18, fontSize: 12, color: "var(--text-muted)" }}>Selected: {destination?.label}</p>
    </div>
  </div>;
}
