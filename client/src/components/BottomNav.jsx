import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  {
    label: "Park",
    path: "/app",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
          fill={active ? "#1B2E28" : "#6B7773"}
        />
      </svg>
    ),
  },
  {
    label: "Trips",
    path: "/app/trips",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6h-2.18c.07-.44.18-.88.18-1.34C18 2.99 16.01 1 13.66 1c-1.4 0-2.72.68-3.54 1.81L12 5l-1.88-2.19C9.06 1.68 7.74 1 6.34 1 3.99 1 2 2.99 2 5.34c0 .46.1.9.18 1.34H0v14h24V6h-4zm-7.66-3c.89 0 1.66.72 1.66 1.66S13.23 6.32 12.34 6.32h-4L9.74 4.5C10.16 3.63 11.12 3 12.34 3zM4 6c0-.89.72-1.66 1.66-1.66C6.88 4.34 7.84 5 8.26 5.87L9.66 8.32H6L4 8V6zm18 12H2v-2h20v2zm0-4H2v-6h20v6z"
          fill={active ? "#1B2E28" : "#6B7773"}
        />
      </svg>
    ),
  },
  {
    label: "Profile",
    path: "/app/profile",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          fill={active ? "#1B2E28" : "#6B7773"}
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function isActive(path) {
    if (path === "/app") return pathname === "/app";
    return pathname.startsWith(path);
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <button
          key={t.path}
          className={`bottom-nav-item${isActive(t.path) ? " active" : ""}`}
          onClick={() => navigate(t.path)}
          aria-label={t.label}
        >
          {t.icon(isActive(t.path))}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
