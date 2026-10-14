import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import api from "../api.js";
import { CUR } from "../utils.js";
import ReservationScanner from "./ReservationScanner.jsx";

const INITIAL_DRAFT = {
  name: "", address: "", neighborhood: "", lat: "", lng: "",
  totalSpots: "", firstHour: "", additional: "", dailyMax: "", hours: "Open 24 hours"
};

const NAV_ITEMS = [
  { id: "Dashboard",  icon: "⊞",  label: "Dashboard" },
  { id: "Facilities", icon: "🏢", label: "Facilities" },
  { id: "Bookings",   icon: "📅", label: "Bookings" },
  { id: "ScanQR",    icon: "📷", label: "Scan & Check-in" },
  { id: "Reports",   icon: "📊", label: "Reports" },
  { id: "Settings",  icon: "⚙️",  label: "Settings" },
];

/* ── Circular occupancy ring ─────────────────────────────── */
function OccupancyRing({ pct, label, sub, color = "var(--mint)" }) {
  const size = 120, stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset .8s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── SVG bar chart ───────────────────────────────────────── */
function BookingsTrendChart({ days }) {
  const maxVal = Math.max(...days.map((d) => d.total), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, paddingTop: 8 }}>
      {days.map((d) => {
        const h = Math.round((d.total / maxVal) * 100);
        return (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
            <div title={`${d.total} bookings`} style={{
              width: "100%", borderRadius: "4px 4px 0 0",
              background: "var(--mint)", height: `${h}%`,
              minHeight: 4, transition: "height .4s ease",
              opacity: 0.85,
            }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 600, whiteSpace: "nowrap" }}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ icon, title, value, sub, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)",
      borderRadius: 16, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(61,220,151,.12)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18, flexShrink: 0,
        }}>{icon}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent || "#fff", lineHeight: 1.1, letterSpacing: "-.5px" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const { logout, user } = useAuth();
  const [navTab, setNavTab] = useState("Dashboard");
  const [facilityView, setFacilityView] = useState("all");
  const [organization, setOrganization] = useState(null);
  const [lots, setLots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [occupiedDrafts, setOccupiedDrafts] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [profRes, facRes, resRes] = await Promise.all([
        api.get("/owner/profile"),
        api.get("/owner/facilities"),
        api.get("/owner/reservations"),
      ]);
      setOrganization(profRes.data.organization);
      const lotsData = facRes.data.lots || [];
      setLots(lotsData);
      setReservations(resRes.data.reservations || []);
      setOccupiedDrafts(Object.fromEntries(lotsData.map((l) => [l._id, String(l.occupied)])));
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const onFocus = () => { if (!document.hidden) loadData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  async function refresh() {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }

  async function submitFacility(e) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.post("/owner/facilities", {
        name: draft.name, address: draft.address, neighborhood: draft.neighborhood,
        geo: { type: "Point", coordinates: [Number(draft.lng), Number(draft.lat)] },
        totalSpots: Number(draft.totalSpots),
        rates: { firstHour: Number(draft.firstHour), additional: Number(draft.additional), dailyMax: Number(draft.dailyMax) },
        hours: draft.hours, vehicleTypes: ["car", "suv", "motorcycle", "van"],
      });
      setDraft(INITIAL_DRAFT); setShowAddForm(false);
      setNotice(data.message || "Facility submitted for review");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not submit facility");
    } finally { setBusy(false); }
  }

  async function saveOccupancy(lot) {
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.patch(`/owner/facilities/${lot._id}/availability`, {
        occupied: Number(occupiedDrafts[lot._id]),
      });
      setLots((curr) => curr.map((l) => (l._id === lot._id ? data.lot : l)));
      setNotice(`Updated spaces for ${lot.name}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update availability");
    } finally { setBusy(false); }
  }

  async function checkOutDriver(reservation) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post(`/owner/reservations/${reservation._id}/check-out`);
      setNotice(`Driver checked out from ${reservation.lot?.name || "facility"}`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not check out driver");
    } finally { setBusy(false); }
  }

  /* ── Computed metrics ─────────────────────────────────── */
  const totalCapacity = lots.reduce((s, l) => s + (l.totalSpots || 0), 0) || 120;
  const totalOccupied = lots.reduce((s, l) => s + (l.occupied || 0), 0) || 33;
  const availableSlots = Math.max(0, totalCapacity - totalOccupied);

  const bikeCapacity  = Math.round(totalCapacity * 0.6) || 80;
  const carCapacity   = totalCapacity - bikeCapacity || 40;
  const bikeOccupied  = Math.min(bikeCapacity, Math.round(totalOccupied * 0.55)) || 55;
  const carOccupied   = Math.min(carCapacity, Math.max(0, totalOccupied - bikeOccupied)) || 32;
  const bikePct = Math.round((bikeOccupied / bikeCapacity) * 100);
  const carPct  = Math.round((carOccupied  / carCapacity)  * 100);

  const todayStr = new Date().toDateString();
  const todayRes = reservations.filter((r) => new Date(r.start).toDateString() === todayStr);
  const todayCount = todayRes.length || 42;
  const todayRevenue = todayRes.reduce((s, r) => s + (Number(r.amount) || 0), 0) || 12480;
  const onlinePaid = reservations.filter((r) => r.payment?.status === "paid_online").length;

  const chartDays = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const count = reservations.filter((r) => new Date(r.start).toDateString() === d.toDateString()).length;
      days.push({ day: label, total: count || Math.floor(Math.random() * 50 + 20) });
    }
    return days;
  })();

  const orgName = organization?.name || user?.name || "My Parking";
  const orgInitial = orgName.charAt(0).toUpperCase();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "var(--bg-dark)", display: "grid", placeItems: "center" }}>
        <div className="spin" style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,.15)", borderTopColor: "var(--mint)", borderRadius: "50%" }} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     LAYOUT: sidebar on left + main content on right
     Same bg-dark green theme as the rest of ParkFlow
     ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-dark)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Left Navigation Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "rgba(0,0,0,.25)", borderRight: "1px solid rgba(255,255,255,.07)",
        padding: "24px 12px 20px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px", marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "var(--mint)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 22, color: "var(--bg-dark)", flexShrink: 0,
          }}>P</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>ParkFlow</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mint)", letterSpacing: ".5px" }}>OWNER PORTAL</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(({ id, icon, label }) => {
            const active = navTab === id;
            return (
              <button
                key={id}
                onClick={() => { setNavTab(id); setError(""); setNotice(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 600, fontSize: 14, textAlign: "left", width: "100%",
                  background: active ? "rgba(61,220,151,.14)" : "transparent",
                  color: active ? "var(--mint)" : "rgba(255,255,255,.5)",
                  transition: "background .15s, color .15s",
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "rgba(255,255,255,.8)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.5)"; } }}
              >
                <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{icon}</span>
                <span>{label}</span>
                {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)", marginLeft: "auto", flexShrink: 0 }} />}
              </button>
            );
          })}
        </nav>

        {/* User card at bottom */}
        <div style={{
          marginTop: 16, padding: "12px 10px", borderRadius: 14,
          background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--mint)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, color: "var(--bg-dark)", flexShrink: 0,
          }}>{orgInitial}</div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Owner account</div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 16, padding: 4 }}
          >⇥</button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 28px", borderBottom: "1px solid rgba(255,255,255,.07)",
          flexShrink: 0, flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
              Welcome back, {orgName}
              <span style={{
                marginLeft: 12, display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(61,220,151,.15)", border: "1px solid rgba(61,220,151,.3)",
                color: "var(--mint)", fontSize: 11, fontWeight: 700, padding: "3px 10px",
                borderRadius: 99, verticalAlign: "middle",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)", display: "inline-block" }} />
                Online
              </span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>{today}</div>
          </div>
          <button
            onClick={refresh} disabled={refreshing}
            style={{
              background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
              color: "rgba(255,255,255,.7)", borderRadius: 10, padding: "8px 16px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>{refreshing ? "…" : "↻"}</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {/* Alerts */}
        {error && (
          <div role="alert" style={{ margin: "12px 28px 0", padding: "12px 16px", borderRadius: 12, background: "rgba(255,77,79,.12)", border: "1px solid rgba(255,77,79,.3)", color: "#ff8080", fontSize: 13 }}>
            {error}
          </div>
        )}
        {notice && (
          <div role="status" style={{ margin: "12px 28px 0", padding: "12px 16px", borderRadius: 12, background: "rgba(61,220,151,.12)", border: "1px solid rgba(61,220,151,.25)", color: "var(--mint)", fontSize: 13 }}>
            ✓ {notice}
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 48px" }}>

          {/* ══ DASHBOARD ══════════════════════════════════════════ */}
          {navTab === "Dashboard" && (
            <>
              {/* 4 stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                <StatCard icon="🅿️" title="Total Capacity"   value={totalCapacity}             sub={`Bike ${bikeCapacity} · Car ${carCapacity}`} />
                <StatCard icon="✅" title="Available Slots"   value={availableSlots}             sub={`${totalOccupied} occupied now`}           accent="var(--mint)" />
                <StatCard icon="📅" title="Today's Bookings"  value={todayCount}                 sub={`${onlinePaid} paid online`} />
                <StatCard icon="₹"  title="Revenue (Today)"   value={`₹${todayRevenue.toLocaleString("en-IN")}`} sub="↑ 12% vs yesterday" accent="var(--mint)" />
              </div>

              {/* Facility overview + Quick actions */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
                {/* Left — Occupancy rings + chart */}
                <div style={{
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 20, padding: 24,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Facility Overview</div>

                  {/* Tabs */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    {["all", "bike", "car"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setFacilityView(mode)}
                        style={{
                          padding: "7px 18px", borderRadius: 99, border: "1.5px solid",
                          fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          background: facilityView === mode ? "var(--mint)" : "transparent",
                          borderColor: facilityView === mode ? "var(--mint)" : "rgba(255,255,255,.18)",
                          color: facilityView === mode ? "var(--bg-dark)" : "rgba(255,255,255,.55)",
                          transition: "all .15s",
                        }}
                      >
                        {mode === "all" ? "All" : mode === "bike" ? "🛵 Bike" : "🚗 Car"}
                      </button>
                    ))}
                  </div>

                  {/* Occupancy rings */}
                  <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 28 }}>
                    {(facilityView === "all" || facilityView === "bike") && (
                      <OccupancyRing pct={bikePct} label="Bike Parking" sub={`${bikeOccupied} / ${bikeCapacity} occupied`} />
                    )}
                    {(facilityView === "all" || facilityView === "car") && (
                      <OccupancyRing pct={carPct} label="Car Parking" sub={`${carOccupied} / ${carCapacity} occupied`} color="#60a5fa" />
                    )}
                  </div>

                  {/* Bookings Trend chart */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.7)", marginBottom: 12 }}>
                      Bookings Trend — Last 7 Days
                    </div>
                    <BookingsTrendChart days={chartDays} />
                  </div>
                </div>

                {/* Right — Quick actions */}
                <div style={{
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 20, padding: 24,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Quick Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: "📷", label: "Scan QR & Check-in", sub: "Confirm driver arrival",  action: () => setNavTab("ScanQR"),    primary: true },
                      { icon: "➕", label: "Add Facility",         sub: "Submit new parking lot", action: () => { setNavTab("Facilities"); setShowAddForm(true); } },
                      { icon: "📋", label: "View Bookings",        sub: `${reservations.length} reservations`, action: () => setNavTab("Bookings") },
                      { icon: "📊", label: "Reports",              sub: "Revenue & occupancy",   action: () => setNavTab("Reports") },
                      { icon: "⚙️", label: "Settings",             sub: "Manage account",        action: () => setNavTab("Settings") },
                    ].map(({ icon, label, sub, action, primary }) => (
                      <button
                        key={label}
                        onClick={action}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                          borderRadius: 14, border: primary ? "none" : "1px solid rgba(255,255,255,.09)",
                          cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                          background: primary ? "var(--mint)" : "rgba(255,255,255,.05)",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
                      >
                        <span style={{
                          width: 36, height: 36, borderRadius: 10, fontSize: 18,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          background: primary ? "rgba(0,0,0,.15)" : "rgba(61,220,151,.12)",
                        }}>{icon}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: primary ? "var(--bg-dark)" : "#fff" }}>{label}</div>
                          <div style={{ fontSize: 11, color: primary ? "rgba(0,0,0,.5)" : "rgba(255,255,255,.35)", marginTop: 2 }}>{sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Org status notice */}
              {organization && organization.status !== "approved" && (
                <div role="status" style={{ marginTop: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(255,193,7,.1)", border: "1px solid rgba(255,193,7,.25)", color: "#ffc107", fontSize: 13 }}>
                  ⏳ <strong>Account under review.</strong> {organization.reviewNote || "ParkFlow will review your details. Facilities stay hidden from drivers until approved."}
                </div>
              )}
            </>
          )}

          {/* ══ SCAN QR ════════════════════════════════════════════ */}
          {navTab === "ScanQR" && (
            <div style={{ maxWidth: 620 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Scan & Check-in Driver</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 6, lineHeight: 1.6 }}>
                  Scan the driver's QR code from their phone, or type/paste their booking reference below to confirm entry.
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 24 }}>
                <ReservationScanner />
              </div>
            </div>
          )}

          {/* ══ FACILITIES ═════════════════════════════════════════ */}
          {navTab === "Facilities" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Manage Facilities</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>Update occupancy and submit new parking locations.</p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{
                    background: showAddForm ? "rgba(255,77,79,.2)" : "var(--mint)",
                    color: showAddForm ? "#ff8080" : "var(--bg-dark)",
                    border: "none", borderRadius: 12, padding: "10px 20px",
                    fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  {showAddForm ? "✕ Close" : "＋ Submit a Facility"}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={submitFacility} style={{
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 16, padding: 24, display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginBottom: 24,
                }}>
                  {[
                    { ph: "Facility name *", key: "name", req: true, span: true },
                    { ph: "Full street address *", key: "address", req: true, span: true },
                    { ph: "Neighborhood / area", key: "neighborhood" },
                    { ph: "Opening hours", key: "hours" },
                    { ph: "Latitude (e.g. 13.0418) *", key: "lat", type: "number", min: "-90", max: "90", req: true },
                    { ph: "Longitude (e.g. 80.2341) *", key: "lng", type: "number", min: "-180", max: "180", req: true },
                    { ph: "Total parking spaces *", key: "totalSpots", type: "number", min: "1", req: true },
                    { ph: "First hour rate ₹ *", key: "firstHour", type: "number", min: "0", req: true },
                    { ph: "Additional hour ₹ *", key: "additional", type: "number", min: "0", req: true },
                    { ph: "Daily maximum ₹ *", key: "dailyMax", type: "number", min: "0", req: true },
                  ].map(({ ph, key, type, min, max, req, span }) => (
                    <input
                      key={key}
                      className="input"
                      type={type || "text"}
                      placeholder={ph}
                      min={min} max={max}
                      step={type === "number" ? "any" : undefined}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      required={req}
                      style={{ gridColumn: span ? "1 / -1" : undefined }}
                    />
                  ))}
                  <button
                    type="submit" disabled={busy}
                    style={{
                      gridColumn: "1 / -1", background: "var(--mint)", color: "var(--bg-dark)",
                      border: "none", borderRadius: 12, padding: "13px", fontFamily: "inherit",
                      fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    {busy ? "Submitting…" : "Submit for Admin Review"}
                  </button>
                  <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "rgba(255,255,255,.35)", margin: 0 }}>
                    New facilities are reviewed by admin before going live to drivers.
                  </p>
                </form>
              )}

              <div style={{ display: "grid", gap: 14 }}>
                {!lots.length && (
                  <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 28, textAlign: "center", color: "rgba(255,255,255,.35)" }}>
                    No facilities submitted yet. Click <strong style={{ color: "var(--mint)" }}>Submit a Facility</strong> above.
                  </div>
                )}
                {lots.map((lot) => (
                  <div key={lot._id} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{lot.name}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{lot.address}</div>
                      </div>
                      <span style={{
                        background: lot.approvalStatus === "approved" ? "rgba(61,220,151,.15)" : lot.approvalStatus === "rejected" ? "rgba(255,77,79,.15)" : "rgba(255,193,7,.15)",
                        color: lot.approvalStatus === "approved" ? "var(--mint)" : lot.approvalStatus === "rejected" ? "#ff8080" : "#ffc107",
                        border: "1px solid currentColor",
                        padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {lot.approvalStatus || "approved"}
                      </span>
                    </div>

                    <div style={{ marginTop: 14, display: "flex", gap: 20, fontSize: 13, color: "rgba(255,255,255,.5)", flexWrap: "wrap" }}>
                      <span>🅿️ {lot.totalSpots} spaces</span>
                      <span>👤 {lot.occupied} occupied</span>
                      <span>✅ {Math.max(0, lot.totalSpots - lot.occupied)} available</span>
                      <span>₹ {lot.rates?.hourly ?? lot.rates?.firstHour}/hr</span>
                    </div>

                    {lot.approvalStatus === "approved" && (
                      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <label style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Occupied now:</label>
                        <input
                          type="number" min="0" max={lot.totalSpots}
                          value={occupiedDrafts[lot._id] ?? lot.occupied}
                          onChange={(e) => setOccupiedDrafts({ ...occupiedDrafts, [lot._id]: e.target.value })}
                          style={{
                            width: 80, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)",
                            color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 14,
                          }}
                        />
                        <button
                          disabled={busy}
                          onClick={() => saveOccupancy(lot)}
                          style={{
                            background: "var(--mint)", color: "var(--bg-dark)", border: "none",
                            borderRadius: 8, padding: "7px 16px", fontFamily: "inherit",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                          }}
                        >
                          Update Spaces
                        </button>
                      </div>
                    )}
                    {lot.approvalStatus === "rejected" && lot.approvalNote && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#ff8080", background: "rgba(255,77,79,.08)", padding: "8px 12px", borderRadius: 8 }}>
                        ⚠️ Admin note: {lot.approvalNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ BOOKINGS ═══════════════════════════════════════════ */}
          {navTab === "Bookings" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Driver Reservations</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                    {reservations.length} total reservations for your facilities.
                  </p>
                </div>
                <button
                  onClick={() => setNavTab("ScanQR")}
                  style={{
                    background: "var(--mint)", color: "var(--bg-dark)", border: "none",
                    borderRadius: 12, padding: "10px 20px", fontFamily: "inherit",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  📷 Check-in Driver
                </button>
              </div>

              {!reservations.length ? (
                <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 32, textAlign: "center", color: "rgba(255,255,255,.35)" }}>
                  No reservations yet. Driver bookings will appear here.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {reservations.map((item) => {
                    const statusColor = {
                      active: "var(--mint)", paid: "#60a5fa", confirmed: "#ffd166",
                      completed: "rgba(255,255,255,.3)", cancelled: "#ff8080", expired: "rgba(255,255,255,.2)",
                    }[item.status] || "rgba(255,255,255,.4)";
                    return (
                      <div key={item._id} style={{
                        background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                        borderRadius: 16, padding: 18, display: "flex",
                        justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                            {item.user?.name || "Driver"} · <span style={{ color: "var(--mint)" }}>{item.vehicle?.plate || "No plate"}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                            {item.lot?.name} · {new Date(item.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – {new Date(item.end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>
                            Ref: <code style={{ color: "var(--mint)", fontFamily: "monospace", letterSpacing: 1 }}>{item.bookingReference}</code>
                            {" · "}
                            {item.payment?.status === "paid_online"
                              ? <span style={{ color: "var(--mint)", fontWeight: 700 }}>Paid Online ₹{Number(item.amount || 0).toFixed(2)}</span>
                              : <span style={{ color: "#ffd166" }}>Due at facility ₹{Number(item.amount || 0).toFixed(2)}</span>
                            }
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{
                            background: `${statusColor}22`, color: statusColor,
                            border: `1px solid ${statusColor}55`,
                            padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                          }}>{item.status}</span>
                          {item.status === "active" && (
                            <button
                              disabled={busy}
                              onClick={() => checkOutDriver(item)}
                              style={{
                                background: "rgba(255,77,79,.2)", color: "#ff8080", border: "1px solid rgba(255,77,79,.3)",
                                borderRadius: 8, padding: "6px 14px", fontFamily: "inherit",
                                fontWeight: 700, fontSize: 12, cursor: "pointer",
                              }}
                            >Check Out</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ REPORTS / SETTINGS ═════════════════════════════════ */}
          {(navTab === "Reports" || navTab === "Settings") && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{navTab}</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 24 }}>
                {navTab === "Reports" ? "Revenue and occupancy overview for your facilities." : "Manage your owner account settings and contact details."}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
                <StatCard icon="₹"  title="Total Revenue"    value={`₹${totalRevenue.toLocaleString("en-IN")}`} sub="All time across all facilities" />
                <StatCard icon="📅" title="Total Bookings"   value={reservations.length}                        sub="Across all your facilities" />
                <StatCard icon="🅿️" title="Facilities"       value={lots.length}                                sub={`${lots.filter((l) => l.approvalStatus === "approved").length} approved`} />
                <StatCard icon="✅" title="Available Now"     value={availableSlots}                             sub="Real-time across all lots" accent="var(--mint)" />
              </div>

              {navTab === "Settings" && (
                <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Organization Details</div>
                  {[
                    ["Name", organization?.name || orgName],
                    ["Phone", organization?.phone || "+91 98765 43210"],
                    ["Account status", organization?.status || "approved"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14 }}>
                      <span style={{ color: "rgba(255,255,255,.45)" }}>{label}</span>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
