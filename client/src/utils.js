// Shared helpers used across components

/** Currency symbol — ₹ for Chennai */
export const CUR = "₹";

export function fmtTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtDateFull(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDuration(start, end) {
  if (!start || !end) return "";
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function fmtCountdown(endsAt) {
  const diff = Math.max(0, new Date(endsAt) - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function amenityLabel(key) {
  const map = { cctv: "CCTV", accessible: "Accessible", ev: "EV", covered: "Covered", attendant: "Attendant" };
  return map[key] || key;
}

export function amenityIcon(key) {
  const map = {
    cctv:       "📷",
    accessible: "♿",
    ev:         "⚡",
    covered:    "🏛️",
    attendant:  "🧑‍💼",
  };
  return map[key] || "✓";
}

export function pinColor(lot) {
  return lot?.pinColor === "orange" ? "orange" : "green";
}
