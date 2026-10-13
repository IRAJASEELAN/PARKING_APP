import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../api.js";
import { useSearch } from "../SearchContext.jsx";
import { CUR } from "../utils.js";
import { directionsPath } from "../utils/directions.js";

const CENTER = [13.0537, 80.2601]; // Anna Salai, Chennai

function ResultMarkers({ lots, selected, onSelect }) {
  const map = useMap();

  useEffect(() => {
    const markers = lots.map((lot) => {
      const [lng, lat] = lot.geo.coordinates;
      const color = lot.pinColor === "orange" ? "#FF8C42" : "#3DDC97";
      const textColor = lot.pinColor === "orange" ? "#fff" : "#0D1A16";
      const isSelected = selected?._id === lot._id;
      const html = `<div style="background:${color};color:${textColor};padding:5px 10px;border-radius:20px;font-size:12px;font-weight:700;border:${isSelected ? "3px solid #1B2E28" : "2px solid #fff"};box-shadow:0 2px 8px rgba(0,0,0,.25);">${CUR}${lot.rates?.hourly ?? lot.rates?.firstHour}</div>`;
      const icon = L.divIcon({ html, className: "", iconAnchor: [28, 14] });
      const m = L.marker([lat, lng], { icon }).addTo(map);
      m.on("click", () => onSelect(lot));
      return m;
    });
    return () => markers.forEach((m) => m.remove());
  }, [lots, selected, map, onSelect]);

  return null;
}

function DiscoveryMarkers({ facilities, selected, onSelect }) {
  const map = useMap();
  useEffect(() => {
    const markers = facilities.map((place) => {
      const html = `<div class="result-osm-pin${selected?.id === place.id ? " selected" : ""}">P</div>`;
      const icon = L.divIcon({ html, className: "", iconAnchor: [15, 15], iconSize: [30, 30] });
      const marker = L.marker([place.lat, place.lng], { icon, title: `${place.name}, live availability not provided` }).addTo(map);
      marker.on("click", () => onSelect(place));
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [facilities, selected, map, onSelect]);
  return null;
}

const SORT_OPTIONS = ["Best match", "Lowest price", "Nearest", "Top rated"];

export default function ResultsPage() {
  const navigate = useNavigate();
  const { filters, destination, setDestination, setFilters } = useSearch();
  const [lots, setLots] = useState([]);
  const [mapFacilities, setMapFacilities] = useState([]);
  const [discoveryError, setDiscoveryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState("Best match");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshError, setRefreshError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setMapFacilities([]);
    setDiscoveryError("");
    api.get("/parking/nearby", { params: { lat: destination?.lat ?? CENTER[0], lng: destination?.lng ?? CENTER[1], radiusKm: 5 }, signal: controller.signal })
      .then(({ data }) => setMapFacilities(data.facilities || []))
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setDiscoveryError("Map listings are temporarily unavailable. ParkFlow facilities are still shown.");
      });
    return () => controller.abort();
  }, [destination?.lat, destination?.lng]);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    async function refresh(initial = false) {
      if (initial) setLoading(true);
      try {
        const params = {
          lat: destination?.lat ?? CENTER[0],
          lng: destination?.lng ?? CENTER[1],
          radiusKm: 25,
          ...(filters.maxPrice < 200 ? { maxPrice: filters.maxPrice } : {}),
          ...(filters.walkMin < 30 ? { walkMin: filters.walkMin } : {}),
          ...(filters.availableNow ? { availableNow: true } : {}),
          ...(filters.reservable ? { reservable: true } : {}),
          ...(filters.vehicle ? { vehicle: filters.vehicle } : {}),
          ...(filters.hours === "24h" ? { hours: "24h" } : {}),
          ...(filters.amenities?.length ? { amenities: filters.amenities.join(",") } : {}),
        };
        const { data } = await api.get("/lots", { params, signal: controller.signal });
        if (!disposed) {
          setLots(sortLots(data.lots || [], sort));
          setSelected((current) => (data.lots || []).find((lot) => lot._id === current?._id) || null);
          setUpdatedAt(new Date());
          setRefreshError("");
        }
      } catch (error) {
        if (!disposed && error.code !== "ERR_CANCELED") setRefreshError("Could not refresh availability. Showing the last results.");
      } finally {
        if (!disposed && initial) setLoading(false);
      }
    }
    refresh(true);
    const interval = window.setInterval(() => refresh(false), 30000);
    return () => { disposed = true; controller.abort(); window.clearInterval(interval); };
  }, [filters, sort, destination?.lat, destination?.lng, destination?.query]);
  function sortLots(arr, s) {
    if (s === "Lowest price") return [...arr].sort((a, b) => (a.rates?.hourly ?? 99) - (b.rates?.hourly ?? 99));
    if (s === "Nearest") return [...arr].sort((a, b) => (a.distanceKm ?? a.walkMin ?? 99) - (b.distanceKm ?? b.walkMin ?? 99));
    if (s === "Top rated") return [...arr].sort((a, b) => (b.driverRating ?? 0) - (a.driverRating ?? 0));
    return arr; // Best match = API default
  }

  function bookNearby(place) {
    setDestination({ label: place.name, query: place.name, lat: place.lat, lng: place.lng });
    setFilters((previous) => ({ ...previous, availableNow: true, reservable: true }));
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Map (top half) */}
      <div style={{ height: 240, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(to bottom, rgba(255,255,255,.9), transparent)" }}>
          <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>
        </div>
        <MapContainer center={[destination?.lat ?? CENTER[0], destination?.lng ?? CENTER[1]]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <ResultMarkers lots={lots} selected={selected} onSelect={setSelected} />
          <DiscoveryMarkers facilities={mapFacilities} selected={selected} onSelect={setSelected} />
        </MapContainer>
        {/* Back button */}
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
          style={{ position: "absolute", top: 44, left: 16, zIndex: 20, boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Results list (bottom half) */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", background: "#fff", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: 18 }}>
                {loading ? "Finding…" : `${lots.length + mapFacilities.length} parking options`}
              </h3>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{destination?.label || "T. Nagar, Chennai"}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{refreshError || (updatedAt ? `ParkFlow availability refreshed ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · refreshes every 30 sec` : "Checking ParkFlow availability…")}</div>
            </div>
            <button
              onClick={() => navigate("/app/filters")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg)", borderRadius: 10, padding: "7px 12px", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}
            >
              ⚙ Filters
            </button>
          </div>
          {/* Sort chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 2 }}>
            {SORT_OPTIONS.map((s) => (
              <button key={s} className={`chip${sort === s ? " active" : ""}`} onClick={() => setSort(s)} style={{ flexShrink: 0 }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {filters.reservable && !loading && lots.length === 0 && <div className="booking-unavailable-note" role="status">
          <strong>No ParkFlow booking partners are available in this search yet.</strong>
          <span>Nearby map listings can show directions, but they don’t share verified spaces or accept ParkFlow reservations.</span>
        </div>}

        {/* Lot list */}
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="spin" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--mint)", borderRadius: "50%", margin: "0 auto" }} />
            </div>
          ) : lots.length === 0 && mapFacilities.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>{discoveryError || "No parking options found nearby. Try increasing the search radius or changing filters."}</p>
          ) : (
            <>
              {lots.map((lot, i) => <LotResult key={lot._id} lot={lot} index={i} onClick={() => navigate(`/app/lots/${lot._id}`)} onBook={() => navigate(`/app/reserve/${lot._id}`)} selected={selected?._id === lot._id} onHover={() => setSelected(lot)} bestMatch={sort === "Best match" && i === 0} />)}
              {mapFacilities.length > 0 && <>
                <div className="discovery-section-heading"><span>MORE NEARBY PLACES</span><small>OpenStreetMap · availability is not shared live</small></div>
                {mapFacilities.map((place) => <DiscoveryResult key={place.id} place={place} selected={selected?.id === place.id} bookableSearch={filters.reservable} onSelect={() => setSelected(place)} onBook={() => bookNearby(place)} onDirections={() => navigate(directionsPath({ lat: place.lat, lng: place.lng, name: place.name, address: place.address }))} />)}
                <p className="discovery-attribution">{discoveryError || "Map data © OpenStreetMap contributors. Prices and live space counts are not provided by this map data."}</p>
              </>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscoveryResult({ place, selected, bookableSearch, onSelect, onBook, onDirections }) {
  return <article className={`discovery-result${selected ? " selected" : ""}`} onMouseEnter={onSelect}>
    <div className="discovery-result-icon">P</div>
    <div className="discovery-result-copy">
      <strong>{place.name}</strong>
      <span>{place.address || place.parkingType} · {place.distanceKm.toFixed(1)} km away</span>
      <small>{place.fee}{place.openingHours ? ` · ${place.openingHours}` : ""}</small>
    </div>
    <div className="discovery-result-actions">{bookableSearch ? <button type="button" disabled>Not bookable</button> : <button type="button" onClick={(event) => { event.stopPropagation(); onBook(); }}>Book nearby</button>}<button type="button" onClick={(event) => { event.stopPropagation(); onDirections(); }}>Directions</button></div>
  </article>;
}

function LotResult({ lot, index, onClick, onBook, selected, onHover, bestMatch }) {
  const available = lot.available ?? Math.max(0, lot.totalSpots - lot.occupied);
  return (
    <div
      className="lot-card"
      onClick={onClick}
      onMouseEnter={onHover}
      style={{ border: selected ? "2px solid var(--mint)" : "2px solid transparent", transition: "all .15s" }}
    >
      {bestMatch && (
        <div style={{ position: "absolute", top: -1, left: 16 }}>
          <span style={{ background: "var(--bg-dark)", color: "var(--mint)", fontSize: 10, fontWeight: 700, borderRadius: "0 0 6px 6px", padding: "2px 8px", letterSpacing: .5 }}>BEST MATCH</span>
        </div>
      )}
      <div className="lot-icon" style={{ fontSize: 20 }}>🅿️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{lot.name}</div>
        <div style={{ fontSize: 10, color: "#839088", marginTop: 3 }}>{lot.isDemoData ? "ParkFlow sample listing · estimated availability" : lot.availabilityFresh ? `${lot.occupancySource || "Operator"} update` : "Availability update is out of date"}</div>
        {bestMatch && <div style={{ fontSize: 12, color: "var(--mint-dark, #1B7A4F)", fontWeight: 700, marginTop: 3 }}>{lot.score ?? 0}/100 match · {(lot.reasons || []).slice(0, 2).join(" · ")}</div>}
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{lot.address}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 12, color: "#FFB800", fontWeight: 600 }}>★ {lot.driverRating}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {lot.distanceKm != null ? `${lot.distanceKm.toFixed(1)} km away` : `${lot.walkMin} min walk`}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: available > 0 ? "#1B7A4F" : "#CF1322", background: available > 0 ? "var(--mint-light)" : "#FFF1F0", borderRadius: 6, padding: "2px 7px" }}>
            {lot.isDemoData ? `${available} est.` : available > 0 ? `${available} left` : "Full"}
          </span>
        </div>
      </div>
      <div className="result-lot-actions">
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--bg-dark)" }}>{CUR}{lot.rates?.hourly ?? lot.rates?.firstHour}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/hr</div>
        {lot.reservable && available > 0 ? <button type="button" className="result-book-button" onClick={(event) => { event.stopPropagation(); onBook(); }}>Book</button> : <span className="result-walkin-label">{lot.reservable ? "Full" : "Walk-in"}</span>}
      </div>
    </div>
  );
}





