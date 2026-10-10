import { Router } from "express";
import { searchPlaces } from "../services/geocoding.js";

export const geocodeRouter = Router();

geocodeRouter.get("/", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 3) return res.status(400).json({ success: false, message: "Enter at least 3 characters to search for a place" });
  if (query.length > 120) return res.status(400).json({ success: false, message: "Search text is too long" });
  try {
    const places = await searchPlaces(query);
    res.set("Cache-Control", "private, max-age=300");
    res.json({ success: true, places, attribution: "© OpenStreetMap contributors" });
  } catch (error) {
    console.error("Place search failed", error.message);
    res.status(503).json({ success: false, message: "Place search is temporarily unavailable. Try again shortly." });
  }
});
