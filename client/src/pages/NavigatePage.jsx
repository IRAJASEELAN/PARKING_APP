import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import api from "../api.js";
import { getCurrentCoordinates } from "../location.js";

const CITY_FALLBACK = { lat: 13.0537, lng: 80.2601 };
function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

export default function NavigatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/reservations/${id}`), getCurrentCoordinates().catch(() => null)])
      .then(([result, coordinates]) => {
        if (!active) return;
        setReservation(result.data);
        setOrigin(coordinates || CITY_FALLBACK);
        setUsingFallback(!coordinates);
      })
      .catch(() => navigate("/app"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const target = useMemo(() => {
    const coordinates = reservation?.lot?.geo?.coordinates;
    return coordinates?.length === 2 ? { lng: coordinates[0], lat: coordinates[1] } : null;
  }, [reservation]);
  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spin" /></div>;
  if (!reservation || !target || !origin) return <div className="shell" style={{ padding: 24 }}>Could not load navigation details.</div>;
  const km = distanceKm(origin, target);
  const eta = Math.max(1, Math.round(km / 18 * 60));
  const line = [[origin.lat, origin.lng], [target.lat, target.lng]];
  const mapCenter = [(origin.lat + target.lat) / 2, (origin.lng + target.lng) / 2];
  return <div className="shell" style={{ position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0 }}>
      <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <Polyline positions={line} pathOptions={{ color: "#16875D", weight: 5, dashArray: "8 8" }} />
        <Marker position={[origin.lat, origin.lng]} />
        <Marker position={[target.lat, target.lng]} />
      </MapContainer>
    </div>
    <div style={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 500 }} className="card">
      <div style={{ fontWeight: 700, fontSize: 18 }}>Directions to {reservation.lot.name}</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{reservation.lot.address}</div>
      <div style={{ display: "flex", gap: 20, marginTop: 12 }}><b>{km.toFixed(1)} km estimated</b><b>~{eta} min drive</b></div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{usingFallback ? "Location permission unavailable; route preview starts from central Chennai." : "Dashed line is a direct preview. Road turn-by-turn routing is not configured."}</p>
    </div>
    <div className="card" style={{ position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 500 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <a className="btn btn-outline" style={{ flex: 1, textAlign: "center" }} href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`} target="_blank" rel="noreferrer">Open Maps</a>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/app/session/${id}`)}>Arrived · Start session</button>
      </div>
      <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => navigate("/app")}>Back to map</button>
    </div>
  </div>;
}
