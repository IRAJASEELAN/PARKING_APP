import { useEffect, useRef, useState } from "react";
import api from "../api.js";

export default function ReservationScanner() {
  const videoRef = useRef(null);
  const [active, setActive] = useState(false);
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    let stream;
    let timer;
    let stopped = false;
    async function startCamera() {
      if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera scanning is unavailable here. Paste the QR contents below instead.");
        return;
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((track) => track.stop()); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        timer = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              window.clearInterval(timer);
              setPayload(codes[0].rawValue);
              setActive(false);
            }
          } catch { /* Wait for the next camera frame. */ }
        }, 450);
      } catch {
        setError("Camera access was denied or is unavailable. Paste the QR contents below instead.");
      }
    }
    startCamera();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active]);

  async function checkIn(event) {
    event.preventDefault();
    setError(""); setResult(null);
    try {
      const { data } = await api.post("/reservations/check-in", { payload });
      setResult(data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not verify this reservation.");
    }
  }

  async function recordFacilityPayment() {
    if (!result?.reservation?.reservationId) return;
    setSettling(true);
    setError("");
    try {
      const { data } = await api.post(`/reservations/${result.reservation.reservationId}/settle`);
      setResult((current) => ({ ...current, reservation: { ...current.reservation, paymentStatus: data.reservation.payment?.status } }));
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not record the facility payment"); }
    finally { setSettling(false); }
  }
  return <section className="card" style={{ padding: 16, marginBottom: 12 }}>
    <h3 style={{ marginTop: 0 }}>Scan driver booking to check in</h3>
    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Only reservations for a facility you manage can check in. Each booking QR works once.</p>
    <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 240, borderRadius: 12, background: "#17221e", display: active ? "block" : "none" }} />
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <button className="btn btn-outline" type="button" onClick={() => { setError(""); setActive((value) => !value); }}>{active ? "Stop camera" : "Scan with camera"}</button>
    </div>
    <form onSubmit={checkIn} style={{ display: "grid", gap: 8 }}>
      <textarea className="input" rows={2} value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="Paste QR data or type Booking Reference (e.g. 7A8B9C0D)" aria-label="Reservation QR contents" required />
      <button className="btn btn-primary" type="submit">Verify & Check In Driver</button>
    </form>
    {error && <p role="alert" style={{ color: "#a61d24", fontSize: 13 }}>{error}</p>}
    {result && <div role="status" style={{ marginTop: 12, padding: 14, borderRadius: 12, background: result.valid ? "var(--mint-light)" : "#fff1f0", border: `1px solid ${result.valid ? "var(--mint-mid)" : "#ffb3ae"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{result.checkedIn ? "✅" : result.alreadyCheckedIn ? "⚠️" : "ℹ️"}</span>
        <b>{result.checkedIn ? "Driver Checked In Successfully!" : result.alreadyCheckedIn ? "Already Checked In" : result.valid ? "Reservation Verified" : "Reservation Not Valid"}</b>
      </div>
      {result.reservation && (
        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
          <div><strong>Facility:</strong> {result.reservation.lot}</div>
          <div><strong>Vehicle:</strong> {result.reservation.vehicle || "Vehicle not listed"}</div>
          <div><strong>Reference:</strong> <code style={{ fontWeight: 700, letterSpacing: 1 }}>{result.reservation.bookingReference}</code></div>
          <div><strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: 700, color: "var(--bg-dark)" }}>{result.reservation.status}</span></div>
          <div>
            <strong>Payment:</strong>{" "}
            {result.reservation.paymentStatus === "paid_online" ? (
              <span style={{ color: "#16804A", fontWeight: 700 }}>₹{Number(result.reservation.amount || 0).toFixed(2)} · Paid Online ✓</span>
            ) : result.reservation.paymentStatus === "paid_at_facility" ? (
              <span style={{ color: "#16804A", fontWeight: 700 }}>₹{Number(result.reservation.amount || 0).toFixed(2)} · Paid at Facility</span>
            ) : (
              <span style={{ color: "#B42318", fontWeight: 700 }}>₹{Number(result.reservation.amount || 0).toFixed(2)} · Payment Due on Arrival</span>
            )}
          </div>
          {result.reservation.paymentStatus !== "paid_at_facility" && result.reservation.paymentStatus !== "paid_online" && (
            <button className="btn btn-outline" type="button" style={{ marginTop: 8 }} onClick={recordFacilityPayment} disabled={settling}>
              {settling ? "Recording…" : "Record Payment Collected at Facility"}
            </button>
          )}
        </div>
      )}
    </div>}
  </section>;
}
