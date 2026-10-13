import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireOwner } from "../middleware/auth.js";
import { Organization } from "../models/Organization.js";
import { Lot } from "../models/Lot.js";
import { Reservation } from "../models/Reservation.js";
import { User } from "../models/User.js";

export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireOwner);
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const validCoordinates = (coordinates) => Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((value) => Number.isFinite(Number(value))) && Number(coordinates[0]) >= -180 && Number(coordinates[0]) <= 180 && Number(coordinates[1]) >= -90 && Number(coordinates[1]) <= 90;
function validateRates(rates = {}) {
  const normalized = { firstHour: Number(rates.firstHour ?? rates.hourly), additional: Number(rates.additional ?? rates.hourly), dailyMax: Number(rates.dailyMax) };
  return Object.values(normalized).every((value) => Number.isFinite(value) && value >= 0 && value <= 100000) ? normalized : null;
}

ownerRouter.get("/profile", async (req, res) => {
  const organization = await Organization.findById(req.user.organizationId).lean();
  if (!organization) return fail(res, 404, "Owner application not found");
  res.json({ success: true, organization });
});

ownerRouter.patch("/profile", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const address = String(req.body?.address || "").trim();
  if (name.length < 2 || name.length > 120 || !/^[+\d() -]{7,24}$/.test(phone) || address.length > 240) return fail(res, 400, "Enter a business name, valid phone, and address under 240 characters");
  const organization = await Organization.findOneAndUpdate({ _id: req.user.organizationId, primaryOwner: req.user._id }, { $set: { name, phone, address, status: "pending", reviewNote: "", reviewedBy: null, reviewedAt: null } }, { new: true, runValidators: true });
  if (!organization) return fail(res, 404, "Owner application not found");
  res.json({ success: true, organization });
});

ownerRouter.get("/overview", async (req, res) => {
  const [organization, lots] = await Promise.all([
    Organization.findById(req.user.organizationId).lean(),
    Lot.find({ ownerOrganization: req.user.organizationId }).sort({ createdAt: -1 }).lean(),
  ]);
  const lotIds = lots.map((lot) => lot._id);
  const [upcoming, checkedIn] = await Promise.all([
    Reservation.countDocuments({ lot: { $in: lotIds }, status: { $in: ["held", "confirmed"] }, start: { $gte: new Date() } }),
    Reservation.countDocuments({ lot: { $in: lotIds }, status: "active" }),
  ]);
  res.json({ success: true, organization, lots, metrics: { facilities: lots.length, pendingFacilities: lots.filter((lot) => lot.approvalStatus === "pending").length, upcomingReservations: upcoming, checkedIn } });
});

ownerRouter.get("/facilities", async (req, res) => {
  const lots = await Lot.find({ ownerOrganization: req.user.organizationId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, lots });
});

ownerRouter.post("/facilities", async (req, res) => {
  try {
    const { name, address, neighborhood, geo, totalSpots, rates, hours, vehicleTypes } = req.body || {};
    const capacity = Number(totalSpots);
    const cleanName = String(name || "").trim();
    const cleanAddress = String(address || "").trim();
    const cleanNeighborhood = String(neighborhood || "").trim();
    const normalizedRates = validateRates(rates);
    if (cleanName.length < 2 || cleanName.length > 120 || cleanAddress.length < 5 || cleanAddress.length > 250 || cleanNeighborhood.length > 100 || !validCoordinates(geo?.coordinates) || !Number.isInteger(capacity) || capacity < 1 || capacity > 100000 || !normalizedRates) return fail(res, 400, "Add a facility name, full address, map coordinates, capacity, and valid rates");
    if (vehicleTypes !== undefined && (!Array.isArray(vehicleTypes) || vehicleTypes.length < 1 || vehicleTypes.some((type) => !["car", "suv", "motorcycle", "van"].includes(type)))) return fail(res, 400, "Select at least one supported vehicle type");
    const organization = await Organization.findById(req.user.organizationId).lean();
    if (!organization) return fail(res, 404, "Owner organization not found");
    const lot = await Lot.create({
      name: cleanName, address: cleanAddress, neighborhood: cleanNeighborhood,
      geo: { type: "Point", coordinates: geo.coordinates.map(Number) },
      totalSpots: capacity, occupied: 0,
      rates: { ...normalizedRates, hourly: normalizedRates.firstHour },
      hours: String(hours || "Open 24 hours").trim().slice(0, 80),
      vehicleTypes: vehicleTypes || ["car"], amenities: [],
      isDemoData: false, reservable: false,
      ownerOrganization: organization._id, approvalStatus: "pending",
      occupancySource: "unknown", occupancyUpdatedAt: null,
    });
    res.status(201).json({ success: true, lot, message: "Facility submitted for ParkFlow review" });
  } catch (error) {
    console.error("Owner facility submission failed", error);
    fail(res, 500, "Unable to submit this facility right now");
  }
});

ownerRouter.patch("/facilities/:id", async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid facility id");
  const lot = await Lot.findOne({ _id: req.params.id, ownerOrganization: req.user.organizationId });
  if (!lot) return fail(res, 404, "Facility not found in your account");
  const body = req.body || {};
  const allowed = ["name", "address", "neighborhood", "geo", "totalSpots", "rates", "hours", "vehicleTypes"];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowed.includes(key))) return fail(res, 400, "Only facility details can be edited here");
  if (body.geo && !validCoordinates(body.geo.coordinates)) return fail(res, 400, "Map coordinates are invalid");
  if (body.totalSpots !== undefined && (!Number.isInteger(Number(body.totalSpots)) || Number(body.totalSpots) < lot.occupied || Number(body.totalSpots) > 100000)) return fail(res, 400, "Capacity must be a whole number and cannot be below current occupancy");
  if (body.rates) { const rates = validateRates(body.rates); if (!rates) return fail(res, 400, "Rates are invalid"); body.rates = { ...rates, hourly: rates.firstHour }; }
  if (body.geo) body.geo = { type: "Point", coordinates: body.geo.coordinates.map(Number) };
  Object.assign(lot, body);
  lot.approvalStatus = "pending";
  lot.approvalNote = "Updated facility details need review";
  lot.reservable = false;
  await lot.save();
  res.json({ success: true, lot });
});

ownerRouter.patch("/facilities/:id/availability", async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid facility id");
  const occupied = Number(req.body?.occupied);
  const lot = await Lot.findOne({ _id: req.params.id, ownerOrganization: req.user.organizationId });
  if (!lot) return fail(res, 404, "Facility not found in your account");
  if (!Number.isInteger(occupied) || occupied < 0 || occupied > lot.totalSpots) return fail(res, 400, "Occupied spaces must be within facility capacity");
  if (lot.approvalStatus !== "approved") return fail(res, 409, "Availability can be updated after the facility is approved");
  lot.occupied = occupied;
  lot.occupancySource = "manual";
  lot.occupancyUpdatedAt = new Date();
  await lot.save();
  res.json({ success: true, lot });
});

ownerRouter.get("/reservations", async (req, res) => {
  const lots = await Lot.find({ ownerOrganization: req.user.organizationId }).select("_id").lean();
  const reservations = await Reservation.find({ lot: { $in: lots.map((lot) => lot._id) } })
    .populate("lot", "name address approvalStatus")
    .populate("user", "name email")
    .sort({ start: 1 }).limit(500);
  res.json({ success: true, reservations });
});

ownerRouter.post("/reservations/:id/check-out", async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid reservation id");
  const session = await mongoose.startSession();
  try {
    let ended;
    await session.withTransaction(async () => {
      const reservation = await Reservation.findById(req.params.id).populate("lot", "ownerOrganization").session(session);
      if (!reservation || String(reservation.lot?.ownerOrganization) !== String(req.user.organizationId)) throw Object.assign(new Error("Reservation not found for a facility you manage"), { status: 404 });
      if (reservation.status !== "active") throw Object.assign(new Error("Only a checked-in driver can be checked out"), { status: 409 });
      const capacity = await Lot.updateOne({ _id: reservation.lot._id, occupied: { $gt: 0 }, reservationClaims: { $elemMatch: { reservationId: reservation._id, status: "active" } } }, { $inc: { occupied: -1 }, $pull: { reservationClaims: { reservationId: reservation._id } } }, { session });
      if (!capacity.modifiedCount) throw Object.assign(new Error("This session no longer holds an active parking space"), { status: 409 });
      ended = await Reservation.findOneAndUpdate({ _id: reservation._id, status: "active" }, { $set: { status: "completed", endedAt: new Date() } }, { new: true, session }).populate("lot");
      if (!ended) throw Object.assign(new Error("This parking session has already ended"), { status: 409 });
      await User.updateOne({ activeReservation: reservation._id }, { $set: { activeReservation: null } }, { session });
    });
    res.json({ success: true, reservation: ended });
  } catch (error) {
    if ([404, 409].includes(error.status)) return fail(res, error.status, error.message);
    console.error("Facility check-out failed", error);
    fail(res, 500, "Unable to check out this driver right now");
  } finally { await session.endSession(); }
});
