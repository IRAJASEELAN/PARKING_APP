import { Router } from "express";
import { getDrivingRoute } from "../services/routing.js";

export const directionsRouter = Router();

function validCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

directionsRouter.get("/route", async (req, res) => {
  const { originLat, originLng, destinationLat, destinationLng } = req.query;
  if (!validCoordinate(originLat, -90, 90) || !validCoordinate(originLng, -180, 180) || !validCoordinate(destinationLat, -90, 90) || !validCoordinate(destinationLng, -180, 180)) {
    return res.status(400).json({ success: false, message: "Valid origin and destination coordinates are required" });
  }
  try {
    const route = await getDrivingRoute(
      { lat: Number(originLat), lng: Number(originLng) },
      { lat: Number(destinationLat), lng: Number(destinationLng) },
    );
    res.set("Cache-Control", "private, max-age=60");
    res.json({ success: true, route });
  } catch (error) {
    console.error("Driving route lookup failed", error.message);
    res.status(503).json({ success: false, message: "Road directions are temporarily unavailable. Try again shortly." });
  }
});
