import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../api.js";
import { useSearch } from "../SearchContext.jsx";
import { CUR } from "../utils.js";
import BottomNav from "../components/BottomNav.jsx";
import { showToast } from "../components/Toast.jsx";

const CHENNAI = [13.0418, 80.2341];
const money = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
function availabilityLabel(lot) {
  if (!lot.availabilityFresh) return "Availability may be out of date";
  const source = lot.occupancySource === "sensor" ? "Sensor update" : lot.occupancySource === "camera" ? "Camera update" : lot.occupancySource === "manual" ? "Operator update" : "Demo estimate";
  return lot.isDemoData ? `Sample facility · ${source}` : source;
}

function parkingIcon(lot, selected) {
  const available = Math.max(0, Number(lot.available ?? lot.totalSpots - lot.occupied) || 0);
  const rate = money(lot.rates?.hourly ?? lot.rates?.firstHour);
  const state = available === 0 ? "full" : available < 10 ? "low" : "open";
  const html = `<div class="parking-map-pin ${state}${selected ? " selected" : ""}"><span class="pin-dot"></span><span>${CUR}${rate}</span><small>${available} free</small></div>`;
  return L.divIcon({ html, className: "parking-map-icon", iconAnchor: [38, 24], iconSize: [76, 48] });
}

function MapEffects({ center }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.65 }); }, [center[0], center[1], map]);
  return null;
}

function FitParkingPins({ lots }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || !lots.length) return;
    const points = lots.map((lot) => [lot.geo.coordinates[1], lot.geo.coordinates[0]]);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.18), { maxZoom: 14, animate: true });
    didFit.current = true;
  }, [lots, map]);
  return null;
}
function MapButtons({ onLocate, locating }) {
  const map = useMap();
  return <div className="map-floating-controls">
    <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}><span>＋</span></button>
    <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}><span>−</span></button>
    <button type="button" aria-label="Use my location" title="Use my location" disabled={locating} onClick={onLocate}><span>{locating ? "…" : "⌖"}</span></button>
  </div>;
}

function ParkingMarkers({ lots, selectedId, onSelect }) {
  const map = useMap();
  useEffect(() => {
    const markers = lots.map((lot) => {
      const coordinates = lot.geo?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
      const marker = L.marker([coordinates[1], coordinates[0]], { icon: parkingIcon(lot, selectedId === lot._id), keyboard: true, title: `${lot.name}, ${lot.available ?? 0} spaces free` }).addTo(map);
      marker.on("click", () => onSelect(lot));
      return marker;
    }).filter(Boolean);
    return () => markers.forEach((marker) => marker.remove());
  }, [lots, selectedId, map, onSelect]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const { filters, setFilters, destination, userLocation, useCurrentLocation } = useSearch();
  const [lots, setLots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const center = [destination?.lat ?? CHENNAI[0], destination?.lng ?? CHENNAI[1]];

  const loadLots = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = {
        lat: center[0], lng: center[1], radiusKm: 25,
        ...(filters.availableNow ? { availableNow: true } : {}),
        ...(filters.vehicle ? { vehicle: filters.vehicle } : {}),
        ...(filters.reservable ? { reservable: true } : {}),
        ...(filters.maxPrice < 200 ? { maxPrice: filters.maxPrice } : {}),
        ...(filters.amenities?.length ? { amenities: filters.amenities.join(",") } : {}),
      };
      const { data } = await api.get("/lots", { params, signal });
      setLots(data.lots || []);
      setSelected((current) => (data.lots || []).find((lot) => lot._id === current?._id) || data.lots?.[0] || null);
    } catch (error) {
      if (error.code !== "ERR_CANCELED") showToast(error?.response?.data?.message || "Could not load parking locations");
    } finally {
      setLoading(false);
    }
  }, [center[0], center[1], filters]);

  useEffect(() => {
    const controller = new AbortController();
    loadLots(controller.signal);
    const timer = window.setInterval(() => loadLots(controller.signal), 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadLots]);

  const handleSelect = useCallback((lot) => setSelected(lot), []);
  async function locateMe() {
    setLocating(true);
    try { await useCurrentLocation(); }
    catch (error) { showToast(error?.message || "Location access is unavailable"); }
    finally { setLocating(false); }
  }

  function findReservableNearby() {
    setFilters((previous) => ({ ...previous, availableNow: true, reservable: true }));
    navigate("/app/results");
  }

  return <div className="shell park-map-shell">
    <div className="park-map-canvas">
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapEffects center={center} />
        <FitParkingPins lots={lots} />
        <ParkingMarkers lots={lots} selectedId={selected?._id} onSelect={handleSelect} />
        {userLocation?.lat != null && userLocation?.lng != null && <><CircleMarker center={[userLocation.lat, userLocation.lng]} radius={20} pathOptions={{ color: "#2563EB", weight: 1, opacity: 0.25, fillColor: "#2563EB", fillOpacity: 0.12 }} /><CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }} /></>}
        <MapButtons onLocate={locateMe} locating={locating} />
      </MapContainer>
    </div>

    <header className="park-map-header">
      <div className="park-map-brand"><span className="park-map-brand-mark">P</span><span>ParkFlow</span><span className="park-map-city">CHENNAI</span></div>
      <button type="button" className="park-map-search" onClick={() => navigate("/app/destination")}>
        <span className="park-map-search-icon">⌕</span>
        <span className="park-map-search-copy"><small>DESTINATION</small><b>{destination?.label || "Where are you going?"}</b></span>
        <span className="park-map-search-arrow">›</span>
      </button>
      <div className="park-map-toolbar">
        <button type="button" className={`map-filter-chip${filters.availableNow ? " active" : ""}`} onClick={() => setFilters((previous) => ({ ...previous, availableNow: !previous.availableNow }))}><span className="availability-pulse" />{filters.availableNow ? "Available" : "All facilities"}</button>
        <button type="button" className={`map-filter-chip${filters.vehicle === "car" ? " active" : ""}`} onClick={() => setFilters((previous) => ({ ...previous, vehicle: previous.vehicle === "car" ? null : "car" }))}>🚘 Car</button>
        <button type="button" className="map-filter-chip" onClick={() => navigate("/app/filters")}>☷ Filters</button>
        <span className="map-result-count">{loading ? "Updating…" : `${lots.length} nearby`}</span>
      </div>
    </header>

    {selected && <section className="park-map-place-card" aria-label="Selected parking facility">
      <div className="map-card-grab" />
      <div className="map-card-topline"><span className="map-card-eyebrow">PARKING NEAR YOU</span><button type="button" className="map-card-close" aria-label="Hide facility preview" onClick={() => setSelected(null)}>×</button></div>
      <button type="button" className="map-card-main" onClick={() => navigate(`/app/lots/${selected._id}`)}>
        <div className="map-card-copy"><h2>{selected.name}</h2><p>{selected.neighborhood || selected.address}</p></div>
        <span className="map-card-chevron">›</span>
      </button>
      <div className="map-card-stats">
        <span className={`map-space-badge${(selected.available ?? 0) < 10 ? " low" : ""}`}><i />{selected.available ?? 0} spaces free</span>
        <span>★ {Number(selected.driverRating || 0).toFixed(1)}</span>
        {selected.distanceKm != null && <span>{selected.distanceKm.toFixed(1)} km</span>}
        <strong>{CUR}{money(selected.rates?.hourly ?? selected.rates?.firstHour)}<small>/hr</small></strong>
      </div>
      <div className="map-card-actions">
        <button type="button" className="map-details-button" onClick={() => navigate(`/app/lots/${selected._id}`)}>Details</button>
        <button type="button" className="map-reserve-button" disabled={selected.reservable && (selected.available ?? 0) < 1} onClick={() => selected.reservable ? navigate(`/app/reserve/${selected._id}`) : findReservableNearby()}>{selected.reservable ? "Reserve parking" : "Find reservable"}<span>→</span></button>
      </div>
      <p className="map-sample-note">{availabilityLabel(selected)} · refreshes every 30 sec</p>
    </section>}
    {!selected && <button type="button" className="map-show-results" onClick={() => navigate("/app/results")}>View {lots.length} facilities <span>↑</span></button>}
    <BottomNav />
  </div>;
}
