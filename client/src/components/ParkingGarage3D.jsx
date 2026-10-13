import { useMemo, useRef, useState } from "react";

const STATUS_LABELS = { AVAILABLE: "Available", OCCUPIED: "Occupied", RESERVED: "Reserved", MAINTENANCE: "Maintenance" };
const toStatusClass = (status) => String(status || "AVAILABLE").toLowerCase();

function CarGlyph() {
  return <svg className="garage-car-glyph" viewBox="0 0 34 52" aria-hidden="true">
    <path d="M10 4h14l5 10 3 6v22a4 4 0 0 1-4 4h-2v3h-5v-3H13v3H8v-3H6a4 4 0 0 1-4-4V20l3-6 5-10Z" fill="currentColor" opacity=".9" />
    <path d="m9 16 2-7h12l2 7H9Zm-2 4h20v12H7V20Z" fill="#f8fbf9" opacity=".9" />
    <path d="M8 38h4m10 0h4" stroke="#0f2920" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
  </svg>;
}

export default function ParkingGarage3D({ slots = [], isDemoData = false }) {
  const [selected, setSelected] = useState(null);
  const [floor, setFloor] = useState("All floors");
  const [topView, setTopView] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  const floors = useMemo(() => ["All floors", ...new Set(slots.map((slot) => slot.floor || "Ground floor"))], [slots]);
  const visibleSlots = useMemo(() => slots.filter((slot) => floor === "All floors" || (slot.floor || "Ground floor") === floor), [slots, floor]);
  const counts = useMemo(() => slots.reduce((result, slot) => {
    const status = STATUS_LABELS[slot.status] ? slot.status : "AVAILABLE";
    result[status] += 1;
    return result;
  }, { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, MAINTENANCE: 0 }), [slots]);
  const rows = useMemo(() => {
    const firstDeck = visibleSlots.slice(0, 12);
    const secondDeck = visibleSlots.slice(12);
    return [firstDeck, secondDeck].filter((deck) => deck.length);
  }, [visibleSlots]);

  function startOrbit(event) {
    if (event.target.closest("button")) return;
    dragRef.current = { x: event.clientX, rotation };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function orbit(event) {
    if (!dragRef.current) return;
    const distance = event.clientX - dragRef.current.x;
    const nextRotation = dragRef.current.rotation + distance * 0.35;
    setRotation(((nextRotation + 180) % 360 + 360) % 360 - 180);
  }
  function stopOrbit() {
    dragRef.current = null;
    setDragging(false);
  }

  return <div className="garage3d">
    <div className="garage3d-toolbar">
      <div className="garage3d-floors" aria-label="Choose parking floor">
        {floors.map((item) => <button type="button" key={item} className={floor === item ? "active" : ""} onClick={() => { setFloor(item); setSelected(null); }}>{item}</button>)}
      </div>
      <div className="garage3d-view-actions">
        <button type="button" className="garage3d-view-toggle" onClick={() => setTopView((value) => !value)}>{topView ? "◇ 3D view" : "▦ Top view"}</button>
        {!topView && rotation !== 0 && <button type="button" className="garage3d-view-toggle" onClick={() => setRotation(0)}>Reset angle</button>}
      </div>
    </div>

    <div className={`garage3d-viewport${dragging ? " is-dragging" : ""}`} onPointerDown={startOrbit} onPointerMove={orbit} onPointerUp={stopOrbit} onPointerCancel={stopOrbit} onLostPointerCapture={stopOrbit} role="group" aria-label="Interactive parking garage. Drag to rotate the view.">
      <div className={`garage3d-stage${topView ? " top-view" : ""}`} style={{ "--garage-rotation": `${rotation}deg` }}>
        <div className="garage3d-building-back" />
        <div className="garage3d-deck">
          {rows.map((deck, deckIndex) => <div className="garage3d-level" key={`deck-${deckIndex}`}>
            {deckIndex > 0 && <div className="garage3d-aisle"><span>DRIVE AISLE</span><i /></div>}
            <div className="garage3d-bays">
              {deck.map((slot) => {
                const selectedSlot = selected?._id === slot._id;
                const status = STATUS_LABELS[slot.status] ? slot.status : "AVAILABLE";
                return <button type="button" key={slot._id} className={`garage3d-bay ${toStatusClass(status)}${selectedSlot ? " selected" : ""}`} onClick={() => setSelected(slot)} aria-pressed={selectedSlot} aria-label={`${slot.slotNumber}, ${STATUS_LABELS[status]}`} title={`${slot.slotNumber} · ${STATUS_LABELS[status]}`}>
                  <span className="garage3d-bay-number">{slot.slotNumber}</span>
                  {status === "AVAILABLE" ? <span className="garage3d-free-mark" aria-hidden="true">+</span> : <CarGlyph />}
                  <span className="garage3d-bay-state">{status === "AVAILABLE" ? "FREE" : status === "OCCUPIED" ? "IN USE" : status === "RESERVED" ? "HELD" : "CLOSED"}</span>
                </button>;
              })}
            </div>
          </div>)}
          <div className="garage3d-deck-edge" />
        </div>
      </div>
      <div className="garage3d-orbit-hint"><span>↔</span> Drag to orbit · select a bay</div>
    </div>

    <div className="garage3d-legend">
      <span><i className="free" />{counts.AVAILABLE} free</span>
      <span><i className="used" />{counts.OCCUPIED} occupied</span>
      <span><i className="held" />{counts.RESERVED} reserved</span>
    </div>
    {selected && <div className="garage3d-selection" role="status">
      <span className={`garage3d-selection-icon ${toStatusClass(selected.status)}`}>{selected.status === "AVAILABLE" ? "✓" : selected.status === "OCCUPIED" ? "●" : selected.status === "RESERVED" ? "R" : "—"}</span>
      <span><b>Bay {selected.slotNumber}</b><small>{selected.floor || "Ground floor"}{selected.section ? ` · ${selected.section}` : ""} · {STATUS_LABELS[selected.status] || "Available"}</small></span>
      <button type="button" onClick={() => setSelected(null)} aria-label="Close selected bay details">×</button>
    </div>}
    <p className="facility-slot-note">{isDemoData ? "Interactive sample layout and simulated occupancy. This view does not assign a specific bay." : "Facility-reported layout. Availability can change; a specific bay is assigned at the facility."}</p>
  </div>;
}
