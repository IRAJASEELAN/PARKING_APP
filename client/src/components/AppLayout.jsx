import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

/* SVG icons for sidebar nav */
function IconPark({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2"/>
      <path d="M8 12h2.5a2.5 2.5 0 0 0 0-5H8v10" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTrips({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconProfile({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke={active ? "#3DDC97" : "currentColor"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconSignOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

const NAV = [
  { path: "/app",         exact: true,  label: "Park",    Icon: IconPark },
  { path: "/app/trips",   exact: false, label: "Trips",   Icon: IconTrips },
  { path: "/app/profile", exact: false, label: "Profile", Icon: IconProfile },
];
const OWNER_NAV = [
  { path: "/app/owner", exact: false, label: "Owner dashboard", Icon: IconTrips },
  { path: "/app/profile", exact: false, label: "Profile", Icon: IconProfile },
];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function isActive(path, exact) {
    return exact ? pathname === path : pathname.startsWith(path);
  }

  const initials = (user?.name || "U")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const navItems = user?.role === "owner" ? OWNER_NAV : user?.role === "admin" ? [...NAV, { path: "/app/admin", exact: false, label: "Admin", Icon: IconTrips }] : NAV;

  return (
    <div className="app-layout">
      {/* ── Sidebar (desktop only) ──────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">P</div>
          <span className="sidebar-logo-text">ParkFlow</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, exact, label, Icon }) => {
            const active = isActive(path, exact);
            return (
              <button
                key={path}
                className={`sidebar-item${active ? " active" : ""}`}
                onClick={() => navigate(path)}
              >
                <span className="sidebar-item-icon">
                  <Icon active={active} />
                </span>
                <span className="sidebar-item-label">{label}</span>
                {active && <span className="sidebar-item-dot" />}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* City badge */}
        <div className="sidebar-city">
          <span>📍</span>
          <span>Chennai, TN</span>
        </div>

        {/* User row */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || "User"}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button
            className="sidebar-signout-btn"
            title="Sign out"
            onClick={() => { logout(); navigate("/"); }}
          >
            <IconSignOut />
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────── */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
