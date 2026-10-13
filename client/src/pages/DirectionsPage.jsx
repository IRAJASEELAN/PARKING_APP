import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../api.js";
import { getCurrentCoordinates } from "../location.js";
import { useSearch } from "../SearchContext.jsx";

function FitRoute({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions).pad(0.16), { maxZoom: 16, animate: true });
  }, [positions, map]);
  return null;
}

function distanceLabel(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.max(10, meters)} m`;
}

export default function DirectionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userLocation } = useSearch();
  const originRef = useRef(userLocation);
  const destination = useMemo(() => ({
    lat: searchParams.has("lat") ? Number(searchParams.get("lat")) : Number.NaN,
    lng: searchParams.has("lng") ? Number(searchParams.get("lng")) : Number.NaN,
    name: searchParams.get("name") || "Parking destination",
    address: searchParams.get("address") || "",
  }), [searchParams]);
  const [origin, setOrigin] = useState(userLocation);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRoute = useCallback(async () => {
    if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
      setError("This parking location is missing map coordinates.");
      return;
    }
    setLoading(true);
    setError("");
    setRoute(null);
    try {
      const start = originRef.current || userLocation || await getCurrentCoordinates();
      originRef.current = start;
      setOrigin(start);
      const { data } = await api.get("/directions/route", { params: {
        originLat: start.lat,
        originLng: start.lng,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
      } });
      setRoute(data.route);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError.message;
      setError(message?.includes("Location") || message?.includes("location")
        ? "Allow location access to build a route from where you are."
        : message || "Could not build road directions. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [destination, userLocation]);

  useEffect(() => { loadRoute(); }, [loadRoute]);

  const routePositions = useMemo(() => route?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [], [route]);
  const hasDestination = Number.isFinite(destination.lat) && Number.isFinite(destination.lng);
  const mapCenter = origin && hasDestination ? [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2] : [hasDestination ? destination.lat : 13.0418, hasDestination ? destination.lng : 80.2341];

  return <div className="shell directions-shell">
    <div className="directions-map">
      <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {origin && <CircleMarker center={[origin.lat, origin.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#3478f6", fillOpacity: 1 }} />}
        {hasDestination && <CircleMarker center={[destination.lat, destination.lng]} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#23a96f", fillOpacity: 1 }} />}
        {routePositions.length > 1 && <><Polyline positions={routePositions} pathOptions={{ color: "#16875D", weight: 6, opacity: .9 }} /><FitRoute positions={routePositions} /></>}
      </MapContainer>
      <button type="button" className="directions-back" onClick={() => navigate(-1)} aria-label="Back">←</button>
      <div className="directions-map-label"><span className="directions-live-dot" />IN-APP DRIVING DIRECTIONS</div>
    </div>

    <section className="directions-panel" aria-live="polite">
      <div className="directions-panel-grab" />
      <div className="directions-title-row">
        <div><div className="directions-kicker">YOUR ROUTE</div><h1>{destination.name}</h1><p>{destination.address || "Parking destination"}</p></div>
        <button type="button" className="directions-refresh" onClick={loadRoute} disabled={loading} aria-label="Refresh route">↻</button>
      </div>
      {route && <div className="directions-summary"><div><strong>{route.distanceKm} km</strong><span>road distance</span></div><div><strong>~{route.durationMinutes} min</strong><span>estimated drive</span></div><span className="directions-origin-label">From your location</span></div>}
      {loading && <div className="directions-status"><span className="spin" />Finding the best road route…</div>}
      {error && <div className="directions-error" role="alert"><span>{error}</span><button type="button" onClick={loadRoute} disabled={loading}>Try again</button></div>}
      {route?.steps?.length > 0 && <div className="directions-steps">
        {route.steps.map((step, index) => <div className="directions-step" key={`${index}-${step.instruction}`}>
          <span className="directions-step-number">{index === 0 ? "•" : index === route.steps.length - 1 ? "✓" : index}</span>
          <div><strong>{step.instruction}</strong><small>{step.street || (index === route.steps.length - 1 ? "Destination" : "Road instruction")}</small></div>
          <span className="directions-step-distance">{distanceLabel(step.distanceMeters)}</span>
        </div>)}
      </div>}
      {route && <p className="directions-attribution">{route.attribution}. Routes are estimates and may not reflect temporary closures.</p>}
    </section>
  </div>;
}
