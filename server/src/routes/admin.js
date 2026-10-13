import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { Lot } from "../models/Lot.js";
import { ParkingSlot } from "../models/ParkingSlot.js";
import { Reservation } from "../models/Reservation.js";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

adminRouter.get("/overview", async (_req, res) => {
  try {
    const [lots, activeReservations, todayReservations, revenue] = await Promise.all([
      Lot.aggregate([{ $group: { _id: null, facilities: { $sum: 1 }, spaces: { $sum: "$totalSpots" }, occupied: { $sum: "$occupied" } } }]),
      Reservation.countDocuments({ status: "active" }),
      Reservation.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Reservation.aggregate([{ $match: { "payment.status": "paid_at_facility" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const totals = lots[0] || { facilities: 0, spaces: 0, occupied: 0 };
    res.json({ success: true, metrics: { totalFacilities: totals.facilities, totalSpaces: totals.spaces, occupiedSpaces: totals.occupied, availableSpaces: Math.max(0, totals.spaces - totals.occupied), activeReservations, todayReservations, revenue: revenue[0]?.total || 0, averageOccupancy: totals.spaces ? Math.round(totals.occupied / totals.spaces * 100) : 0, isDemoEstimate: true } });
  } catch (err) { console.error("Admin overview failed", err); fail(res, 500, "Unable to load dashboard metrics"); }
});

adminRouter.get("/lots", async (_req, res) => {
  try { const lots = await Lot.find().sort({ name: 1 }).lean(); res.json({ success: true, lots }); }
  catch (err) { console.error("Admin lots query failed", err); fail(res, 500, "Unable to load parking facilities"); }
});
adminRouter.post("/lots", async (req, res) => {
  try {
    const { name, address, neighborhood, geo, totalSpots, rates, amenities, vehicleTypes, isDemoData } = req.body || {};
    const coords = geo?.coordinates;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || !Array.isArray(coords) || coords.length !== 2 || !coords.every((value) => Number.isFinite(Number(value))) || Number(coords[0]) < -180 || Number(coords[0]) > 180 || Number(coords[1]) < -90 || Number(coords[1]) > 90 || !Number.isInteger(Number(totalSpots)) || Number(totalSpots) < 1 || Number(totalSpots) > 100000) return fail(res, 400, "Name, valid coordinates, and a capacity from 1 to 100,000 are required");
    const normalizedRates = { firstHour: Number(rates?.firstHour ?? rates?.hourly), additional: Number(rates?.additional ?? rates?.hourly), dailyMax: Number(rates?.dailyMax) };
    if (Object.values(normalizedRates).some((value) => !Number.isFinite(value) || value < 0 || value > 100000)) return fail(res, 400, "Parking rates must be valid amounts between ₹0 and ₹100,000");
    if (vehicleTypes !== undefined && (!Array.isArray(vehicleTypes) || vehicleTypes.some((type) => !["car", "suv", "motorcycle", "van"].includes(type)))) return fail(res, 400, "Vehicle types are invalid");
    const lot = await Lot.create({ name: name.trim(), address: String(address || "").trim().slice(0, 250), neighborhood: String(neighborhood || "").trim().slice(0, 100), geo: { type: "Point", coordinates: coords.map(Number) }, totalSpots: Number(totalSpots), occupied: 0, rates: { ...normalizedRates, hourly: normalizedRates.firstHour }, amenities: Array.isArray(amenities) ? amenities.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 40)).slice(0, 20) : [], vehicleTypes: Array.isArray(vehicleTypes) ? vehicleTypes : ["car"], isDemoData: typeof isDemoData === "boolean" ? isDemoData : true, occupancySource: "unknown", occupancyUpdatedAt: null });
    res.status(201).json({ success: true, lot });
  } catch (err) { console.error("Admin lot creation failed", err); fail(res, 500, "Unable to create this parking facility"); }
});
adminRouter.patch("/lots/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid facility id");
    const allowed = ["name", "address", "neighborhood", "rates", "amenities", "hours", "safetyScore", "driverRating", "totalSpots", "occupied", "reservable", "vehicleTypes", "approvalStatus", "approvalNote"];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(update).length) return fail(res, 400, "No editable facility fields were provided");
    if (update.approvalStatus !== undefined && !["pending", "approved", "rejected"].includes(update.approvalStatus)) return fail(res, 400, "Facility review status is invalid");
    if (update.totalSpots !== undefined && (!Number.isInteger(Number(update.totalSpots)) || Number(update.totalSpots) < 1)) return fail(res, 400, "Capacity must be a positive whole number");
    if (update.safetyScore !== undefined && (!Number.isFinite(Number(update.safetyScore)) || update.safetyScore < 0 || update.safetyScore > 5)) return fail(res, 400, "Sample safety score must be between 0 and 5");
    const lot = await Lot.findById(req.params.id);
    if (!lot) return fail(res, 404, "Parking facility not found");
    if (update.approvalStatus === "approved" && lot.ownerOrganization) {
      const organization = await Organization.findById(lot.ownerOrganization).select("status").lean();
      if (organization?.status !== "approved") return fail(res, 409, "Approve this owner's application before approving its facilities");
    }
    Object.assign(lot, update);
    if (update.approvalStatus && update.approvalStatus !== "approved") lot.reservable = false;
    if (update.approvalStatus === "approved" && update.reservable === undefined) lot.reservable = true;
    if (update.occupied !== undefined) { lot.occupancySource = "manual"; lot.occupancyUpdatedAt = new Date(); }
    if (lot.totalSpots < lot.occupied) return fail(res, 409, "Capacity cannot be lower than current occupancy");
    await lot.save();
    res.json({ success: true, lot });
  } catch (err) { console.error("Admin lot update failed", err); fail(res, 500, "Unable to update this parking facility"); }
});
adminRouter.delete("/lots/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid facility id");
    if (await Reservation.exists({ lot: req.params.id })) return fail(res, 409, "A facility with reservation history cannot be removed");
    await ParkingSlot.deleteMany({ lotId: req.params.id });
    const deleted = await Lot.findByIdAndDelete(req.params.id);
    if (!deleted) return fail(res, 404, "Parking facility not found");
    res.json({ success: true, message: "Facility removed" });
  } catch (err) { console.error("Admin lot removal failed", err); fail(res, 500, "Unable to remove this parking facility"); }
});

adminRouter.get("/slots", async (req, res) => {
  try {
    if (req.query.lotId && !validId(req.query.lotId)) return fail(res, 400, "Invalid facility id");
    const slots = await ParkingSlot.find(req.query.lotId ? { lotId: req.query.lotId } : {}).populate("lotId", "name").sort({ slotNumber: 1 });
    res.json({ success: true, slots });
  } catch (err) { console.error("Admin slots query failed", err); fail(res, 500, "Unable to load parking slots"); }
});
adminRouter.post("/slots", async (req, res) => {
  try {
    const { lotId, slotNumber, floor, section, vehicleType } = req.body || {};
    if (!validId(lotId) || typeof slotNumber !== "string" || !slotNumber.trim()) return fail(res, 400, "Facility and slot number are required");
    const lot = await Lot.findById(lotId);
    if (!lot) return fail(res, 404, "Parking facility not found");
    const count = await ParkingSlot.countDocuments({ lotId });
    if (count >= lot.totalSpots) return fail(res, 409, "Slot records cannot exceed facility capacity");
    const slot = await ParkingSlot.create({ lotId, slotNumber: slotNumber.trim().slice(0, 32), floor, section, vehicleType });
    res.status(201).json({ success: true, slot });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, "That slot number already exists at this facility");
    console.error("Admin slot creation failed", err); fail(res, 500, "Unable to create this parking slot");
  }
});
adminRouter.patch("/slots/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid slot id");
    const { status, sensorId, floor, section } = req.body || {};
    const update = Object.fromEntries(Object.entries({ status, sensorId, floor, section }).filter(([, value]) => value !== undefined));
    const slot = await ParkingSlot.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!slot) return fail(res, 404, "Parking slot not found");
    res.json({ success: true, slot });
  } catch (err) { console.error("Admin slot update failed", err); fail(res, 500, "Unable to update this parking slot"); }
});

adminRouter.get("/reservations", async (_req, res) => {
  try { res.json({ success: true, reservations: await Reservation.find().populate("user", "name email").populate("lot", "name").sort({ createdAt: -1 }).limit(200) }); }
  catch (err) { console.error("Admin reservation query failed", err); fail(res, 500, "Unable to load reservations"); }
});
adminRouter.get("/users", async (_req, res) => {
  try { const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(200); res.json({ success: true, users }); }
  catch (err) { console.error("Admin users query failed", err); fail(res, 500, "Unable to load users"); }
});

adminRouter.get("/organizations", async (_req, res) => {
  try {
    const organizations = await Organization.find().populate("primaryOwner", "name email").sort({ createdAt: -1 }).limit(300).lean();
    res.json({ success: true, organizations });
  } catch (err) { console.error("Organization review list failed", err); fail(res, 500, "Unable to load owner applications"); }
});
adminRouter.patch("/organizations/:id/review", async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid owner application id");
    const status = req.body?.status;
    if (!["approved", "rejected", "pending"].includes(status)) return fail(res, 400, "Choose approved, rejected, or pending");
    const organization = await Organization.findByIdAndUpdate(req.params.id, { $set: { status, reviewNote: String(req.body?.reviewNote || "").trim().slice(0, 500), reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true, runValidators: true }).populate("primaryOwner", "name email");
    if (!organization) return fail(res, 404, "Owner application not found");
    res.json({ success: true, organization });
  } catch (err) { console.error("Organization review update failed", err); fail(res, 500, "Unable to update owner application"); }
});



