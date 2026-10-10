import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useSearch } from "../SearchContext.jsx";

const FALLBACK = [13.0418, 80.2341];
function PickOnMap({ onPick }) {
  useMapEvents({ click(event) { onPick({ lat: event.latlng.lat, lng: event.latlng.lng }); } });
  return null;
}

export default function SelectDestinationPage() {
  const navigate = useNavigate();
  const { destination, setDestination } = useSearch();
  const [picked, setPicked] = useState(null);
  const center = [destination?.lat ?? FALLBACK[0], destination?.lng ?? FALLBACK[1]];
  function choose(point) {
    setPicked(point);
    setDestination({ ...point, label: "Selected map location", query: "" });
  }
  return <div className="shell" style={{ position: "relative", background: "#fff" }}>
    <div className="page-header" style={{ position: "absolute", top: 8, left: 12, right: 12, zIndex: 500, background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px #0002" }}>
      <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
      <div><h3>Select a destination</h3><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tap the map to place a pin</div></div>
    </div>
    <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <PickOnMap onPick={choose} />
      {picked && <Marker position={[picked.lat, picked.lng]} />}
    </MapContainer>
    <div style={{ position: "absolute", bottom: 18, left: 16, right: 16, zIndex: 500, background: "#fff", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px #0002" }}>
      <div style={{ marginBottom: 10, fontSize: 14 }}>{picked ? `Pinned: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : "Choose a point on the map"}</div>
      <button className="btn btn-primary" disabled={!picked} onClick={() => navigate("/app/results")}>Find parking nearby</button>
    </div>
  </div>;
}
