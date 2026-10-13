import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";
import { amenityIcon, amenityLabel, CUR } from "../utils.js";
import { useSearch } from "../SearchContext.jsx";
import { directionsPath } from "../utils/directions.js";
import ParkingGarage3D from "../components/ParkingGarage3D.jsx";

export default function FacilityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setDestination, setFilters } = useSearch();
  const [lot, setLot] = useState(null);
  const [slotMap, setSlotMap] = useState({ slots: [], mappedSpaces: 0, totalSpaces: 0, isDemoData: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/lots/${id}`), api.get(`/lots/${id}/slots`)])
      .then(([lotResponse, slotResponse]) => {
        setLot(lotResponse.data);
        setSlotMap(slotResponse.data);
      })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div className="spin" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--mint)", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!lot) return null;

  const available = lot.available ?? Math.max(0, lot.totalSpots - lot.occupied);
  const occupancyPct = Math.round((lot.occupied / lot.totalSpots) * 100);
  function findBookableNearby() {
    const [lng, lat] = lot.geo.coordinates;
    setDestination({ label: lot.name, query: lot.name, lat, lng });
    setFilters((previous) => ({ ...previous, availableNow: true, reservable: true }));
    navigate("/app/results");
  }

  return (
    <div className="shell" style={{ background: "#fff", overflowY: "auto" }}>
      {/* Hero photo */}
      <div style={{ position: "relative", height: 260, flexShrink: 0 }}>
        <img
          src={lot.photoUrl}
          alt={lot.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80"; }}
        />
        {/* Gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 60%)" }} />
        {/* Status bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <div className="status-bar light"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>
        </div>
        {/* Back button */}
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
          style={{ position: "absolute", top: 44, left: 16, background: "rgba(255,255,255,.9)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Share button */}
        <button
          onClick={() => { navigator.clipboard?.writeText(window.location.href); import("../components/Toast.jsx").then(m => m.showToast("Link copied!")); }}
          style={{ position: "absolute", top: 44, right: 16, background: "rgba(255,255,255,.9)", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="#0F1F1A" strokeWidth="2"/><circle cx="6" cy="12" r="3" stroke="#0F1F1A" strokeWidth="2"/><circle cx="18" cy="19" r="3" stroke="#0F1F1A" strokeWidth="2"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="#0F1F1A" strokeWidth="2"/></svg>
        </button>
        {/* Price badge */}
        <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(0,0,0,.7)", color: "#fff", borderRadius: 12, padding: "8px 14px" }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{CUR}{lot.rates?.hourly ?? lot.rates?.firstHour}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>/hr</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 20px 120px" }}>
        {/* Name & rating */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, lineHeight: 1.25 }}>{lot.name}</h2>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{lot.address}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>★ {lot.driverRating}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{lot.reviewCount} reviews</div>
          </div>
        </div>

        {/* Status chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span className="chip mint">{lot.hours}</span>
          <span className="chip" style={{ background: available > 5 ? "var(--mint-light)" : available > 0 ? "#FFF7E6" : "#FFF1F0", borderColor: available > 5 ? "var(--mint-mid)" : available > 0 ? "#FFD591" : "#FFB3AE", color: available > 5 ? "var(--bg-dark)" : available > 0 ? "#874D00" : "#CF1322" }}>
            {available > 0 ? `${available} of ${lot.totalSpots} available` : "Currently full"}
          </span>
          <span className="chip">{lot.walkMin} min walk</span>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{lot.isDemoData ? "Sample facility data" : lot.availabilityFresh ? `${lot.occupancySource || "Facility"} availability update` : "No recent facility availability update"}{lot.occupancyUpdatedAt ? ` · ${new Date(lot.occupancyUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
        {/* Occupancy bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Occupancy</span>
            <span style={{ fontWeight: 600 }}>{occupancyPct}%</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${occupancyPct}%`, background: occupancyPct > 80 ? "var(--orange)" : "var(--mint)", borderRadius: 3, transition: "width .4s" }} />
          </div>
        </div>

        {/* Mapped parking spaces */}
        <section className="facility-slots">
          <div className="facility-slots-heading">
            <div><span className="facility-kicker">SPACE AVAILABILITY</span><h3>Parking layout</h3></div>
            <span className="facility-slots-count">{slotMap.mappedSpaces} mapped</span>
          </div>
          {slotMap.slots.length ? <ParkingGarage3D slots={slotMap.slots} isDemoData={slotMap.isDemoData} /> : <div className="facility-slots-empty">Individual spaces haven’t been mapped for this facility yet. You can still reserve from the facility’s available capacity.</div>}
        </section>
        {/* Amenity icons */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Amenities</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(lot.amenities || []).map((a) => (
              <div key={a} className="amenity-icon">
                <div className="icon-wrap">{amenityIcon(a)}</div>
                {amenityLabel(a)}
              </div>
            ))}
          </div>
        </div>

        {/* Rates */}
        <div style={{ marginTop: 24, background: "var(--bg)", borderRadius: 16, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Rates</div>
          {[
            ["First hour", `${CUR}${lot.rates?.firstHour ?? lot.rates?.hourly}`],
            ["Additional hours", `${CUR}${lot.rates?.additional ?? lot.rates?.hourly}/hr`],
            ["Daily max", `${CUR}${lot.rates?.dailyMax}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Entrance info */}
        <div style={{ marginTop: 16, padding: "14px 16px", background: "var(--mint-light)", borderRadius: 14, border: "1px solid var(--mint-mid)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--bg-dark)", marginBottom: 4 }}>🚗 {lot.entrance}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>{lot.entranceHint}</div>
        </div>

        {/* Review */}
        {lot.reviewQuote && (
          <div style={{ marginTop: 20, padding: "16px 18px", background: "#fff", borderRadius: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Reviews</span>
              <span style={{ fontSize: 13, color: "#FFB800" }}>★ {lot.driverRating}</span>
            </div>
            <blockquote style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-2)", fontStyle: "italic", margin: 0 }}>
              "{lot.reviewQuote}"
            </blockquote>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>— {lot.reviewAuthor} · {lot.reviewCount} reviews</div>
          </div>
        )}

        {/* Safety score */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg)", borderRadius: 14 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Sample safety score: {lot.safetyScore}/5.0</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sample score only · facility details are not independently verified</div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="facility-sticky-actions">
        <button className="btn btn-outline" onClick={() => { const [lng, lat] = lot.geo.coordinates; navigate(directionsPath({ lat, lng, name: lot.name, address: lot.address })); }}>Directions</button>
        <button className="btn btn-primary" onClick={() => lot.reservable && available > 0 ? navigate(`/app/reserve/${lot._id}`) : findBookableNearby()}>
          {lot.reservable && available > 0 ? "Reserve a space" : "Find bookable nearby"} →
        </button>
      </div>
    </div>
  );
}




