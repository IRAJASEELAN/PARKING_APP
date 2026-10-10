import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { Lot } from "../models/Lot.js";
import { Reservation } from "../models/Reservation.js";
import { User } from "../models/User.js";
import { createReservationWindow, calculateQuote } from "../services/reservationRules.js";

export const reservationsRouter = Router();
const ACTIVE_STATUSES = ["held", "confirmed", "paid", "active"];
const HOLD_MS = 10 * 60 * 1000;
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function apiError(res, status, message) { return res.status(status).json({ success: false, message }); }
async function expireUserHolds(userId) {
  const now = new Date();
  const stale = await Reservation.find({ user: userId, $or: [{ status: "held", expiresAt: { $lte: now } }, { status: { $in: ["confirmed", "paid"] }, end: { $lte: now } }] }).select("_id lot");
  if (!stale.length) return;
  const ids = stale.map((item) => item._id);
  await Reservation.updateMany({ _id: { $in: ids }, status: { $in: ["held", "confirmed", "paid"] } }, { $set: { status: "expired" } });
  await Lot.updateMany({ _id: { $in: stale.map((item) => item.lot) } }, { $pull: { reservationClaims: { reservationId: { $in: ids } } } });
}
function claimCapacityExpression(start, end, now) {
  return { $size: { $filter: { input: { $ifNull: ["$reservationClaims", []] }, as: "claim", cond: { $and: [
    { $lt: ["$$claim.start", end] }, { $gt: ["$$claim.end", start] },
    { $or: [ { $in: ["$$claim.status", ["confirmed", "paid"]] }, { $and: [ { $eq: ["$$claim.status", "held"] }, { $gt: ["$$claim.expiresAt", now] } ] } ] },
  ] } } } };
}

reservationsRouter.post("/verify", requireAuth, requireAdmin, async (req, res) => {
  try {
    const payload = typeof req.body?.payload === "string" ? JSON.parse(req.body.payload) : req.body?.payload;
    if (payload?.type !== "PARKFLOW_RESERVATION" || !validId(payload.reservationId) || typeof payload.bookingReference !== "string") return apiError(res, 400, "Invalid reservation QR payload");
    const reservation = await Reservation.findOne({ _id: payload.reservationId, bookingReference: payload.bookingReference }).populate("lot", "name address");
    if (!reservation || !["confirmed", "paid", "active"].includes(reservation.status)) return res.status(404).json({ success: true, valid: false, message: "Reservation is not valid for entry" });
    res.json({ success: true, valid: true, reservation: { reservationId: String(reservation._id), bookingReference: reservation.bookingReference, status: reservation.status, paymentStatus: reservation.payment?.status || "due", amount: reservation.amount, start: reservation.start, end: reservation.end, lot: reservation.lot?.name, vehicle: reservation.vehicle?.plate } });
  } catch (err) {
    if (err instanceof SyntaxError) return apiError(res, 400, "Invalid reservation QR payload");
    console.error("QR verification failed", err);
    apiError(res, 500, "Unable to verify this reservation right now");
  }
});
reservationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    await expireUserHolds(req.user._id);
    const list = await Reservation.find({ user: req.user._id }).populate("lot").sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { console.error("Reservation list failed", err); apiError(res, 500, "Unable to load reservations right now"); }
});

reservationsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    await expireUserHolds(req.user._id);
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id }).populate("lot");
    if (!reservation) return apiError(res, 404, "Reservation not found");
    res.json(reservation);
  } catch (err) { console.error("Reservation lookup failed", err); apiError(res, 500, "Unable to load this reservation right now"); }
});

reservationsRouter.post("/", requireAuth, async (req, res) => {
  let reservationId;
  let claimLotId;
  try {
    const { lotId, start, durationHours, vehicle } = req.body || {};
    if (!validId(lotId)) return apiError(res, 400, "Invalid facility id");
    const lot = await Lot.findById(lotId).lean();
    if (!lot) return apiError(res, 404, "Parking facility not found");
    if (!lot.reservable) return apiError(res, 409, "This facility does not accept reservations.");
    const now = new Date();
    const window = createReservationWindow(start, durationHours, now);
    if (window.error) return apiError(res, 400, window.error);
    const { hours, startDate, endDate } = window;
    const selectedVehicle = vehicle?.plate ? req.user.vehicles.find((item) => item.plate === vehicle.plate) : req.user.vehicles[0];
    if (!selectedVehicle) return apiError(res, 400, "Choose a vehicle saved to your account");
    if (!lot.vehicleTypes?.includes(String(vehicle?.type || "car").toLowerCase())) return apiError(res, 400, "This facility does not support your vehicle type");
    const duplicate = await Reservation.findOne({ user: req.user._id, lot: lot._id, status: { $in: ACTIVE_STATUSES }, start: { $lt: endDate }, end: { $gt: startDate }, $or: [{ status: { $in: ["confirmed", "paid", "active"] } }, { status: "held", expiresAt: { $gt: now } }] });
    if (duplicate) return apiError(res, 409, "You already have a reservation for this facility and time.");
    const priceBreakdown = calculateQuote(lot, hours);
    const amount = priceBreakdown.total;
    if (!Number.isFinite(amount) || amount < 0) return apiError(res, 500, "This facility has invalid pricing configured");
    reservationId = new mongoose.Types.ObjectId();
    claimLotId = lot._id;
    const expiresAt = new Date(now.getTime() + HOLD_MS);
    const claim = { reservationId, start: startDate, end: endDate, expiresAt, status: "held" };
    const claimed = await Lot.findOneAndUpdate({ _id: lot._id, $expr: { $lt: [claimCapacityExpression(startDate, endDate, now), { $subtract: ["$totalSpots", "$occupied"] }] } }, { $push: { reservationClaims: claim } }, { new: true });
    if (!claimed) return apiError(res, 409, "No parking spaces are available for the selected time.");
    const bookingReference = crypto.randomBytes(6).toString("hex").toUpperCase();
    const qrPayload = JSON.stringify({ reservationId: String(reservationId), bookingReference, type: "PARKFLOW_RESERVATION" });
    const reservation = await Reservation.create({ _id: reservationId, user: req.user._id, lot: lot._id, start: startDate, end: endDate, vehicle: { plate: selectedVehicle.plate, make: selectedVehicle.make }, status: "held", amount, priceBreakdown, durationHours: hours, expiresAt, bookingReference, qrPayload });
    res.status(201).json(await reservation.populate("lot"));
  } catch (err) {
    if (reservationId && claimLotId) await Lot.updateOne({ _id: claimLotId }, { $pull: { reservationClaims: { reservationId } } }).catch(() => {});
    console.error("Reservation creation failed", err);
    apiError(res, 500, "Unable to create this reservation right now");
  }
});

reservationsRouter.post("/:id/confirm", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    await expireUserHolds(req.user._id);
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id }).populate("lot");
    if (!reservation) return apiError(res, 404, "Reservation not found");
    if (["confirmed", "paid"].includes(reservation.status)) return res.json(reservation);
    if (reservation.status !== "held" || !reservation.expiresAt || reservation.expiresAt <= new Date()) return apiError(res, 409, "This reservation hold has expired.");
    const confirmed = await Reservation.findOneAndUpdate({ _id: reservation._id, user: req.user._id, status: "held", expiresAt: { $gt: new Date() } }, { $set: { status: "confirmed", "payment.method": "pay_at_facility", "payment.status": "due" }, $unset: { expiresAt: 1 } }, { new: true }).populate("lot");
    if (!confirmed) return apiError(res, 409, "This reservation hold has expired.");
    await Lot.updateOne({ _id: reservation.lot._id, "reservationClaims.reservationId": reservation._id }, { $set: { "reservationClaims.$.status": "confirmed", "reservationClaims.$.expiresAt": null } });
    res.json(confirmed);
  } catch (err) { console.error("Reservation confirmation failed", err); apiError(res, 500, "Unable to confirm this reservation right now"); }
});
reservationsRouter.post("/:id/start", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const now = new Date();
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id });
    if (!reservation) return apiError(res, 404, "Reservation not found");
    if (!["confirmed", "paid"].includes(reservation.status)) return apiError(res, 409, "Only a confirmed reservation can start a parking session.");
    if (now < new Date(reservation.start.getTime() - 30 * 60 * 1000) || now >= reservation.end) return apiError(res, 409, "This reservation is outside its start window.");
    if (await Reservation.exists({ user: req.user._id, status: "active", _id: { $ne: reservation._id } })) return apiError(res, 409, "You already have an active parking session.");
    const userClaim = await User.findOneAndUpdate({ _id: req.user._id, $or: [{ activeReservation: null }, { activeReservation: { $exists: false } }] }, { $set: { activeReservation: reservation._id } }, { new: true });
    if (!userClaim) return apiError(res, 409, "You already have an active parking session.");
    const lot = await Lot.findById(reservation.lot).select("totalSpots");
    if (!lot) return apiError(res, 404, "Parking facility not found");
    const lotUpdate = await Lot.updateOne({ _id: reservation.lot, occupied: { $lt: lot.totalSpots }, reservationClaims: { $elemMatch: { reservationId: reservation._id, status: { $in: ["confirmed", "paid"] } } } }, { $inc: { occupied: 1 }, $set: { "reservationClaims.$.status": "active" } });
    if (!lotUpdate.modifiedCount) { await User.updateOne({ _id: req.user._id, activeReservation: reservation._id }, { $set: { activeReservation: null } }); return apiError(res, 409, "The reserved space is no longer available."); }
    const started = await Reservation.findOneAndUpdate({ _id: reservation._id, status: { $in: ["confirmed", "paid"] } }, { $set: { status: "active", startedAt: now } }, { new: true }).populate("lot");
    if (!started) {
      await Lot.updateOne({ _id: reservation.lot, "reservationClaims.reservationId": reservation._id }, { $inc: { occupied: -1 }, $set: { "reservationClaims.$.status": reservation.status } });
      await User.updateOne({ _id: req.user._id, activeReservation: reservation._id }, { $set: { activeReservation: null } });
      return apiError(res, 409, "This reservation has already changed state.");
    }
    res.json(started);
  } catch (err) { console.error("Session start failed", err); apiError(res, 500, "Unable to start this parking session right now"); }
});

reservationsRouter.post("/:id/end", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const ended = await Reservation.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: "active" }, { $set: { status: "completed", endedAt: new Date() } }, { new: true }).populate("lot");
    if (!ended) return apiError(res, 409, "Only an active session can be ended.");
    await Lot.updateOne({ _id: ended.lot._id, "reservationClaims.reservationId": ended._id }, { $inc: { occupied: -1 }, $pull: { reservationClaims: { reservationId: ended._id } } });
    await User.updateOne({ _id: req.user._id, activeReservation: ended._id }, { $set: { activeReservation: null } });
    res.json(ended);
  } catch (err) { console.error("Session end failed", err); apiError(res, 500, "Unable to end this parking session right now"); }
});

reservationsRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    await expireUserHolds(req.user._id);
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id });
    if (!reservation || !["held", "confirmed", "paid"].includes(reservation.status)) return apiError(res, 409, "This reservation can no longer be cancelled.");
    const cancelled = await Reservation.findOneAndUpdate({ _id: reservation._id, user: req.user._id, status: reservation.status }, { $set: { status: "cancelled" } }, { new: true }).populate("lot");
    if (!cancelled) return apiError(res, 409, "This reservation changed while cancellation was processing.");
    await Lot.updateOne({ _id: cancelled.lot._id }, { $pull: { reservationClaims: { reservationId: cancelled._id } } });
    res.json(cancelled);
  } catch (err) { console.error("Reservation cancellation failed", err); apiError(res, 500, "Unable to cancel this reservation right now"); }
});
reservationsRouter.post("/:id/settle", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const settled = await Reservation.findOneAndUpdate({ _id: req.params.id, status: { $in: ["confirmed", "active", "completed"] }, "payment.status": { $ne: "paid_at_facility" } }, { $set: { "payment.method": "pay_at_facility", "payment.status": "paid_at_facility", "payment.settledAt": new Date(), "payment.settledBy": req.user._id } }, { new: true });
    if (!settled) return apiError(res, 409, "This reservation is not eligible for settlement or was already marked paid.");
    res.json({ success: true, reservation: settled });
  } catch (err) { console.error("On-site settlement failed", err); apiError(res, 500, "Unable to record the on-site payment"); }
});
reservationsRouter.post("/:id/extend", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const hours = Number(req.body?.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 8) return apiError(res, 400, "Choose an extension between 1 and 8 hours");
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id, status: "active" }).populate("lot");
    if (!reservation) return apiError(res, 409, "Only an active session can be extended.");
    const previousEnd = new Date(reservation.end);
    const extendedEnd = new Date(previousEnd.getTime() + hours * 60 * 60 * 1000);
    const now = new Date();
    const capacity = await Lot.findOneAndUpdate({
      _id: reservation.lot._id,
      $expr: {
        $lt: [
          { $size: { $filter: { input: { $ifNull: ["$reservationClaims", []] }, as: "claim", cond: { $and: [
            { $ne: ["$$claim.reservationId", reservation._id] },
            { $lt: ["$$claim.start", extendedEnd] }, { $gt: ["$$claim.end", previousEnd] },
            { $or: [ { $in: ["$$claim.status", ["confirmed", "paid"]] }, { $and: [ { $eq: ["$$claim.status", "held"] }, { $gt: ["$$claim.expiresAt", now] } ] } ] },
          ] } } } },
          { $subtract: ["$totalSpots", "$occupied"] },
        ],
      },
      reservationClaims: { $elemMatch: { reservationId: reservation._id, status: "active", end: previousEnd } },
    }, { $set: { "reservationClaims.$.end": extendedEnd } }, { new: true });
    if (!capacity) return apiError(res, 409, "There is not enough availability to extend this session.");
    reservation.end = extendedEnd;
    reservation.durationHours += hours;
    reservation.priceBreakdown = calculateQuote(reservation.lot, reservation.durationHours);
    reservation.amount = reservation.priceBreakdown.total;
    try {
      const saved = await reservation.save();
      res.json(saved);
    } catch (err) {
      await Lot.updateOne({ _id: reservation.lot._id, "reservationClaims.reservationId": reservation._id }, { $set: { "reservationClaims.$.end": previousEnd } }).catch(() => {});
      throw err;
    }
  } catch (err) { console.error("Reservation extension failed", err); apiError(res, 500, "Unable to extend this session right now"); }
});














