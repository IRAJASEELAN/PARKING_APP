import { Router } from "express";
import mongoose from "mongoose";
import { Lot } from "../models/Lot.js";
import { ParkingSlot } from "../models/ParkingSlot.js";
import { rankLots } from "../services/recommendations.js";
import { haversineKm } from "../services/geo.js";
import { calculateQuote } from "../services/reservationRules.js";

export const lotsRouter = Router();

function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function validCoordinate(value, min, max) { const number = Number(value); return Number.isFinite(number) && number >= min && number <= max; }

lotsRouter.get("/", async (req, res) => {
  try {
    const { q, maxPrice, walkMin, availableNow, reservable, vehicle, amenities, hours, lat, lng, radiusKm } = req.query;
    if (q && String(q).length > 100) return res.status(400).json({ success: false, message: "Search text is too long" });
    if (maxPrice !== undefined && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)) return res.status(400).json({ success: false, message: "Price filter is invalid" });
    if ((lat !== undefined || lng !== undefined) && (!validCoordinate(lat, -90, 90) || !validCoordinate(lng, -180, 180))) return res.status(400).json({ success: false, message: "A valid latitude and longitude are required" });
    if (radiusKm !== undefined && (!Number.isFinite(Number(radiusKm)) || Number(radiusKm) < 1 || Number(radiusKm) > 200)) return res.status(400).json({ success: false, message: "Search radius must be between 1 and 200 km" });
    const filter = {};
    if (q) {
      const term = new RegExp(escaped(String(q).trim()), "i");
      filter.$or = [{ name: term }, { address: term }, { neighborhood: term }];
    }
    if (maxPrice !== undefined) filter["rates.hourly"] = { $lte: Number(maxPrice) };
    if (reservable === "true") filter.reservable = true;
    if (vehicle) filter.vehicleTypes = String(vehicle).toLowerCase();
    if (hours === "24h" || hours === "anytime") filter.hours = /24/i;
    if (amenities) {
      const list = String(amenities).split(",").filter(Boolean);
      if (list.length) filter.amenities = { $all: list };
    }
    let lots = await Lot.find({ $and: [filter, { $or: [{ isDemoData: true }, { approvalStatus: "approved" }] }] }).lean();
    lots = lots.map((lot) => {
      const available = Math.max(0, (Number(lot.totalSpots) || 0) - (Number(lot.occupied) || 0));
      const updatedAt = lot.occupancyUpdatedAt ? new Date(lot.occupancyUpdatedAt) : null;
      const json = { ...lot, available, occupancySource: lot.occupancySource || (lot.isDemoData ? "simulation" : "unknown"), availabilityFresh: Boolean(updatedAt && Date.now() - updatedAt.getTime() <= 5 * 60 * 1000) };
      if (lat !== undefined && lng !== undefined) {
        const [lotLng, lotLat] = lot.geo.coordinates;
        json.distanceKm = Number(haversineKm(Number(lng), Number(lat), lotLng, lotLat).toFixed(2));
      }
      return json;
    });
    if (radiusKm !== undefined && lat !== undefined && lng !== undefined) lots = lots.filter((lot) => lot.distanceKm <= Number(radiusKm));
    if (availableNow === "true") lots = lots.filter((lot) => lot.available > 0);
    if (walkMin !== undefined) {
      if (!Number.isFinite(Number(walkMin)) || Number(walkMin) < 0) return res.status(400).json({ success: false, message: "Walking time filter is invalid" });
      lots = lots.filter((lot) => Number(lot.walkMin) <= Number(walkMin));
    }
    lots = rankLots(lots);
    res.json({ success: true, count: lots.length, lots });
  } catch (err) {
    console.error("Lot search failed", err);
    res.status(500).json({ success: false, message: "Unable to search parking facilities right now" });
  }
});

lotsRouter.get("/:id/quote", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid facility id" });
    const hours = Number(req.query.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 24) return res.status(400).json({ success: false, message: "Choose a duration between 1 and 24 hours" });
    const lot = await Lot.findById(req.params.id).select("rates").lean();
    if (!lot) return res.status(404).json({ success: false, message: "Parking facility not found" });
    res.json({ success: true, quote: calculateQuote(lot, hours) });
  } catch (error) {
    console.error("Parking quote failed", error);
    res.status(500).json({ success: false, message: "Unable to calculate this parking quote" });
  }
});
lotsRouter.get("/:id/slots", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid facility id" });
    const lot = await Lot.findById(req.params.id).select("isDemoData totalSpots").lean();
    if (!lot) return res.status(404).json({ success: false, message: "Parking facility not found" });
    const slots = await ParkingSlot.find({ lotId: req.params.id }).select("slotNumber floor section vehicleType status isDemoData").sort({ floor: 1, section: 1, slotNumber: 1 }).lean();
    res.json({ success: true, isDemoData: Boolean(lot.isDemoData), totalSpaces: lot.totalSpots, mappedSpaces: slots.length, slots });
  } catch (err) {
    console.error("Parking slot lookup failed", err);
    res.status(500).json({ success: false, message: "Unable to load spaces for this facility" });
  }
});
lotsRouter.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid facility id" });
    const lot = await Lot.findById(req.params.id);
    if (!lot) return res.status(404).json({ success: false, message: "Parking facility not found" });
    if (!lot.isDemoData && lot.approvalStatus !== "approved") return res.status(404).json({ success: false, message: "Parking facility not found" });
    const json = lot.toJSON();
    json.available = Math.max(0, lot.totalSpots - lot.occupied);
    json.availabilityFresh = Boolean(lot.occupancyUpdatedAt && Date.now() - new Date(lot.occupancyUpdatedAt).getTime() <= 5 * 60 * 1000);
    json.occupancySource = lot.occupancySource || (lot.isDemoData ? "simulation" : "unknown");
    res.json(json);
  } catch (err) {
    console.error("Facility lookup failed", err);
    res.status(500).json({ success: false, message: "Unable to load this parking facility right now" });
  }
});




