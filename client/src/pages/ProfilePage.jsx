import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import api from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import { showToast } from "../components/Toast.jsx";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleSaving, setVehicleSaving] = useState(false);
  useEffect(() => { api.get("/reservations").then(({ data }) => setReservations(Array.isArray(data) ? data : [])).catch(() => {}); }, []);

  async function saveName() {
    setSaving(true);
    try {
      const { data } = await api.patch("/users/me", { name });
      setUser(data);
      localStorage.setItem("pf_user", JSON.stringify(data));
      setEditName(false);
      showToast("Name updated!");
    } catch {
      showToast("Could not update. Try again.");
    } finally {
      setSaving(false);
    }
  }


  async function saveVehicles(nextVehicles) {
    setVehicleSaving(true);
    try {
      const { data } = await api.patch("/users/me", { vehicles: nextVehicles });
      setUser(data);
      localStorage.setItem("pf_user", JSON.stringify(data));
      showToast("Vehicles updated");
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not update vehicles");
    } finally { setVehicleSaving(false); }
  }

  async function addVehicle(event) {
    event.preventDefault();
    if (!vehiclePlate.trim()) return;
    await saveVehicles([...(user?.vehicles || []), { plate: vehiclePlate, make: vehicleMake }]);
    setVehiclePlate(""); setVehicleMake("");
  }
  function handleLogout() {
    logout();
    navigate("/");
  }

  const initials = (user?.name || "J")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="shell" style={{ background: "var(--bg)" }}>
      <div className="status-bar dark"><span>9:41</span><div className="status-icons"><span>●●●</span><span>🔋</span></div></div>

      {/* Profile header */}
      <div style={{ background: "var(--bg-dark)", padding: "24px 20px 32px" }}>
        <h2 style={{ color: "#fff", fontSize: 22, marginBottom: 20 }}>Profile</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--mint)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "var(--bg-dark)", flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Name / edit */}
          <div style={{ flex: 1 }}>
            {editName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 10, padding: "8px 12px", flex: 1 }}
                  autoFocus
                />
                <button onClick={saveName} disabled={saving} style={{ background: "var(--mint)", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => { setEditName(false); setName(user?.name || ""); }} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{user?.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{user?.email}</div>
                </div>
                <button onClick={() => setEditName(true)} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 0, marginTop: 24, background: "rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
          {[
            [reservations.filter((item) => !["cancelled", "expired"].includes(item.status)).length, "Bookings"],
            [reservations.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.durationHours || 0), 0), "Hours parked"],
            [user?.vehicles?.length || 0, "Vehicles"],
          ].map(([val, lbl], i) => (
            <div
              key={lbl}
              style={{
                flex: 1, textAlign: "center", padding: "14px 8px",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,.1)" : "none",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>{val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>
        <section className="card" style={{ padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>Your vehicles</h3>
          {user?.vehicles?.length ? user.vehicles.map((vehicle) => <div key={vehicle.plate} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)" }}><div><b>{vehicle.make || "Vehicle"}</b><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{vehicle.plate}</div></div><button type="button" className="btn btn-ghost" disabled={vehicleSaving} onClick={() => saveVehicles(user.vehicles.filter((item) => item.plate !== vehicle.plate))}>Remove</button></div>) : <p style={{ color: "var(--text-muted)" }}>No vehicles saved. Add one to book parking.</p>}
          {(user?.vehicles?.length || 0) < 5 && <form onSubmit={addVehicle} style={{ display: "grid", gap: 8, marginTop: 12 }}><input className="input" value={vehicleMake} onChange={(event) => setVehicleMake(event.target.value)} maxLength={60} placeholder="Make and model" aria-label="Vehicle make and model" /><input className="input" value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value.toUpperCase())} maxLength={15} placeholder="Registration number" aria-label="Vehicle registration number" required /><button className="btn btn-outline" type="submit" disabled={vehicleSaving || !vehiclePlate.trim()}>{vehicleSaving ? "Saving…" : "Add vehicle"}</button></form>}
          <h3>Saved places</h3>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>Home: {user?.savedPlaces?.home || "Not set"}<br />Work: {user?.savedPlaces?.work || "Not set"}</div>
          <h3>Payment</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 0 }}>Payment is processed by the configured checkout provider. ParkFlow never stores card numbers.</p>
        </section>

        {/* App version */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text-muted)" }}>
          ParkFlow v1.0.0 · Chennai, TN
        </div>

        {/* Logout */}
        <button
          className="btn btn-outline"
          style={{ marginTop: 16, color: "var(--red)", borderColor: "var(--red)" }}
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

