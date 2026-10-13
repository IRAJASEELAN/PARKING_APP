import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import { directionsPath } from "../utils/directions.js";

export default function NavigatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/reservations/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const coordinates = data.lot?.geo?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length !== 2) {
          setError("This facility is missing map coordinates.");
          return;
        }
        navigate(directionsPath({
          lng: coordinates[0],
          lat: coordinates[1],
          name: data.lot.name,
          address: data.lot.address,
        }), { replace: true });
      })
      .catch(() => { if (active) setError("We couldn’t load this reservation’s directions."); });
    return () => { active = false; };
  }, [id, navigate]);

  return <div className="shell" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
    {error ? <><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => navigate("/app/trips")}>View my trips</button></> : <><div className="spin" /><p>Opening directions in ParkFlow…</p></>}
  </div>;
}
