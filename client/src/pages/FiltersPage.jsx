import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../SearchContext.jsx";
import { CUR } from "../utils.js";

const VEHICLE_TYPES = ["Car", "SUV", "Van", "Motorcycle"];
const AMENITY_OPTIONS = [
  { id: "cctv", label: "CCTV", icon: "📷" },
  { id: "accessible", label: "Accessible", icon: "♿" },
  { id: "covered", label: "Covered", icon: "🏛️" },
  { id: "ev", label: "EV Charging", icon: "⚡" },
  { id: "attendant", label: "Attendant", icon: "🧑‍💼" },
];
const HOURS_OPTIONS = ["Anytime", "24 hours", "Now open"];

export default function FiltersPage() {
  const navigate = useNavigate();
  const { filters, setFilters } = useSearch();

  const [local, setLocal] = useState({ ...filters });

  function toggleAmenity(id) {
    setLocal((prev) => {
      const has = prev.amenities.includes(id);
      return { ...prev, amenities: has ? prev.amenities.filter((a) => a !== id) : [...prev.amenities, id] };
    });
  }

  function apply() {
    setFilters(local);
    navigate("/app/results");
  }

  function reset() {
    const def = { maxPrice: 200, walkMin: 5, availableNow: true, reservable: false, vehicle: "car", amenities: [], hours: "anytime" };
    setLocal(def);
    setFilters(def);
  }

  return (
    <div className="shell" style={{ background: "#fff" }}>
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="#0F1F1A" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </button>
        <h3 style={{ flex: 1, textAlign: "center" }}>Filters</h3>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-muted)", fontFamily: "inherit", fontWeight: 600 }}>
          Reset
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 120px" }}>
        <FilterSection title="Max price per hour">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Up to</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{CUR}{local.maxPrice}/hr</span>
          </div>
          <input
            type="range" className="slider"
            min={20} max={200} step={10} value={local.maxPrice}
            onChange={(e) => setLocal({ ...local, maxPrice: Number(e.target.value) })}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span>{CUR}20</span><span>{CUR}200</span>
          </div>
        </FilterSection>

        {/* Walk time */}
        <FilterSection title="Max walk time">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[2, 5, 10, 15, 20].map((min) => (
              <button
                key={min}
                className={`chip${local.walkMin === min ? " active" : ""}`}
                onClick={() => setLocal({ ...local, walkMin: min })}
              >
                {min} min
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ToggleRow
              label="Available now"
              desc="Only show garages with open spots"
              checked={local.availableNow}
              onChange={(v) => setLocal({ ...local, availableNow: v })}
            />
            <ToggleRow
              label="Reservable"
              desc="Pre-book a guaranteed spot"
              checked={local.reservable}
              onChange={(v) => setLocal({ ...local, reservable: v })}
            />
          </div>
        </FilterSection>

        {/* Vehicle */}
        <FilterSection title="Vehicle type">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v}
                className={`chip${local.vehicle === v.toLowerCase() ? " active" : ""}`}
                onClick={() => setLocal({ ...local, vehicle: v.toLowerCase() })}
              >
                {v}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Amenities */}
        <FilterSection title="Amenities">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AMENITY_OPTIONS.map((a) => {
              const on = local.amenities.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAmenity(a.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12,
                    border: `1.5px solid ${on ? "var(--mint)" : "var(--border)"}`,
                    background: on ? "var(--mint-light)" : "var(--bg)",
                    cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text)", textAlign: "left" }}>{a.label}</span>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: on ? "var(--mint)" : "#fff",
                    border: `2px solid ${on ? "var(--mint)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                  }}>
                    {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0D1A16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Hours */}
        <FilterSection title="Hours">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                className={`chip${local.hours === (h === "Anytime" ? "anytime" : h === "24 hours" ? "24h" : "nowopen") ? " active" : ""}`}
                onClick={() => setLocal({ ...local, hours: h === "Anytime" ? "anytime" : h === "24 hours" ? "24h" : "nowopen" })}
              >
                {h}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-mint" style={{ fontSize: 16, fontWeight: 700 }} onClick={apply}>
          Show 32 parking options
        </button>
      </div>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "var(--text)" }}>{title}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
        {desc && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="toggle-track" />
        <div className="toggle-thumb" />
      </label>
    </div>
  );
}

