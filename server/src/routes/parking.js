import { Router } from "express";
import { discoverParking } from "../services/parkingDiscovery.js";

export const parkingRouter = Router();

function coordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

parkingRouter.get("/nearby", async (req, res) => {
  const { lat, lng } = req.query;
  const radiusKm = Number(req.query.radiusKm ?? 5);
  if (!coordinate(lat, -90, 90) || !coordinate(lng, -180, 180)) {
    return res.status(400).json({ success: false, message: "A valid latitude and longitude are required" });
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 15) {
    return res.status(400).json({ success: false, message: "Search radius must be between 1 and 15 km" });
  }
  try {
    const result = await discoverParking({ lat: Number(lat), lng: Number(lng), radiusKm });
    res.set("Cache-Control", "private, max-age=300");
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Nearby parking discovery failed", error.message);
    res.status(503).json({ success: false, message: "Nearby map listings are temporarily unavailable" });
  }
});
