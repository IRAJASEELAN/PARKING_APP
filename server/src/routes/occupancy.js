import { Router } from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { Lot } from "../models/Lot.js";
import { validateOccupancyReport } from "../services/occupancy.js";

export const occupancyRouter = Router();
function authorized(req) {
  const expected = process.env.OCCUPANCY_WEBHOOK_SECRET || "";
  const supplied = req.get("x-occupancy-token") || "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

occupancyRouter.post("/report", async (req, res) => {
  if (!process.env.OCCUPANCY_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: "Occupancy reporting is not configured" });
  if (!authorized(req)) return res.status(401).json({ success: false, message: "Occupancy source authentication failed" });
  const { lotId, occupied, observedAt } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(lotId) || !observedAt) return res.status(400).json({ success: false, message: "Facility, whole-number occupancy, and observation time are required" });
  const timestamp = new Date(observedAt);
  if (Number.isNaN(timestamp.getTime())) return res.status(400).json({ success: false, message: "Occupancy observation time is invalid" });
  try {
    const lot = await Lot.findById(lotId);
    if (!lot) return res.status(404).json({ success: false, message: "Parking facility not found" });
    const invalidReport = validateOccupancyReport({ occupied, totalSpots: lot.totalSpots, observedAt: timestamp, lastUpdated: lot.occupancyUpdatedAt });
    if (invalidReport) return res.status(invalidReport.status).json({ success: false, message: invalidReport.message });
    const updated = await Lot.findOneAndUpdate({ _id: lotId, totalSpots: { $gte: occupied }, $or: [{ occupancyUpdatedAt: null }, { occupancyUpdatedAt: { $lt: timestamp } }] }, { $set: { occupied, occupancySource: "sensor", occupancyUpdatedAt: timestamp } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: "Occupancy changed before this update could be applied" });
    res.json({ success: true, lotId: String(updated._id), available: Math.max(0, updated.totalSpots - updated.occupied), source: updated.occupancySource, updatedAt: updated.occupancyUpdatedAt });
  } catch (error) {
    console.error("Occupancy update failed", error);
    res.status(500).json({ success: false, message: "Unable to apply this occupancy update" });
  }
});

