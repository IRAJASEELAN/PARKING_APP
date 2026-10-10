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

  async function verify(event) {
    event.preventDefault();
    setError(""); setResult(null);
    try {
      const { data } = await api.post("/reservations/verify", { payload });
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
    <h3 style={{ marginTop: 0 }}>Verify reservation QR</h3>
    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>The server checks the booking reference and current reservation status.</p>
    <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 240, borderRadius: 12, background: "#17221e", display: active ? "block" : "none" }} />
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <button className="btn btn-outline" type="button" onClick={() => { setError(""); setActive((value) => !value); }}>{active ? "Stop camera" : "Scan with camera"}</button>
    </div>
    <form onSubmit={verify} style={{ display: "grid", gap: 8 }}>
      <textarea className="input" rows={3} value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="Paste the QR contents" aria-label="Reservation QR contents" required />
      <button className="btn btn-primary" type="submit">Verify booking</button>
    </form>
    {error && <p role="alert" style={{ color: "#a61d24", fontSize: 13 }}>{error}</p>}
    {result && <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: result.valid ? "var(--mint-light)" : "#fff1f0" }}>
      <b>{result.valid ? "Valid reservation" : "Reservation not valid"}</b>
      {result.reservation && <><div style={{ fontSize: 13, marginTop: 6 }}>{result.reservation.lot} · {result.reservation.vehicle || "Vehicle not listed"} · {result.reservation.status} · {result.reservation.bookingReference}</div><div style={{ fontSize: 13, marginTop: 6 }}>₹{Number(result.reservation.amount || 0).toFixed(2)} · {result.reservation.paymentStatus === "paid_at_facility" ? "Paid at facility" : "Payment due at facility"}</div>{result.reservation.paymentStatus !== "paid_at_facility" && <button className="btn btn-outline" type="button" style={{ marginTop: 10 }} onClick={recordFacilityPayment} disabled={settling}>{settling ? "Recording…" : "Record payment collected at facility"}</button>}</>}
    </div>}
  </section>;
}