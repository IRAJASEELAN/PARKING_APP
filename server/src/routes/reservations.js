import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Lot } from "../models/Lot.js";
import { Reservation } from "../models/Reservation.js";
import { User } from "../models/User.js";
import { createReservationWindow, calculateQuote } from "../services/reservationRules.js";

export const reservationsRouter = Router();
const ACTIVE_STATUSES = ["held", "confirmed", "paid", "active"];
const HOLD_MS = 10 * 60 * 1000;
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function apiError(res, status, message) { return res.status(status).json({ success: false, message }); }
function qrSignature(reservationId, bookingReference) {
  const secret = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET || "";
  return crypto.createHmac("sha256", secret).update(`${reservationId}:${bookingReference}`).digest("hex");
}
function addQrPayload(reservation) {
  const plain = reservation?.toObject ? reservation.toObject() : { ...reservation };
  if (plain?._id && plain?.bookingReference) {
    plain.qrPayload = JSON.stringify({
      type: "PARKFLOW_RESERVATION",
      reservationId: String(plain._id),
      bookingReference: plain.bookingReference,
      signature: qrSignature(String(plain._id), plain.bookingReference),
    });
  }
  return plain;
}
function readQrPayload(input) {
  try {
    const payload = typeof input === "string" ? JSON.parse(input) : input;
    if (payload?.type !== "PARKFLOW_RESERVATION" || !validId(payload.reservationId) || typeof payload.bookingReference !== "string" || !/^[a-f0-9]{64}$/i.test(payload.signature || "")) return null;
    const expected = Buffer.from(qrSignature(payload.reservationId, payload.bookingReference), "hex");
    const actual = Buffer.from(payload.signature, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    return payload;
  } catch { return null; }
}
function canManageLot(user, lot) {
  return user.role === "admin" || (user.role === "owner" && lot.ownerOrganization && String(user.organizationId) === String(lot.ownerOrganization));
}
async function findReservationFromQr(input) {
  let payload = readQrPayload(input);
  if (payload) {
    const reservation = await Reservation.findOne({ _id: payload.reservationId, bookingReference: payload.bookingReference }).populate("lot");
    return { payload, reservation };
  }
  // Resilient fallback: support booking reference code (e.g. "A1B2C3D4")
  if (typeof input === "string" && input.trim()) {
    const cleaned = input.trim().toUpperCase();
    const reservation = await Reservation.findOne({ bookingReference: cleaned }).populate("lot");
    if (reservation) {
      return {
        payload: { type: "PARKFLOW_RESERVATION", reservationId: String(reservation._id), bookingReference: reservation.bookingReference },
        reservation
      };
    }
  }
  return { payload: null, reservation: null };
}
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

/* ── QR verify (no check-in) ── */
reservationsRouter.post("/verify", requireAuth, async (req, res) => {
  try {
    const { payload, reservation } = await findReservationFromQr(req.body?.payload);
    if (!payload) return apiError(res, 400, "Invalid or outdated reservation QR");
    if (!reservation || !canManageLot(req.user, reservation.lot)) return res.status(404).json({ success: true, valid: false, message: "Reservation not found for a facility you manage" });
    if (!["confirmed", "paid", "active"].includes(reservation.status)) return res.status(409).json({ success: true, valid: false, message: "Reservation is not valid for entry" });
    res.json({ success: true, valid: true, alreadyCheckedIn: Boolean(reservation.checkedInAt), reservation: { reservationId: String(reservation._id), bookingReference: reservation.bookingReference, status: reservation.status, paymentStatus: reservation.payment?.status || "due", amount: reservation.amount, start: reservation.start, end: reservation.end, lot: reservation.lot?.name, vehicle: reservation.vehicle?.plate } });
  } catch (err) {
    console.error("QR verification failed", err);
    apiError(res, 500, "Unable to verify this reservation right now");
  }
});

/* ── QR check-in (owner scans driver QR) ── */
reservationsRouter.post("/check-in", requireAuth, async (req, res) => {
  let lotId, userClaimed = false, lotClaimed = false, originalClaimStatus = "confirmed", reservationId;
  try {
    const { payload, reservation } = await findReservationFromQr(req.body?.payload);
    if (!payload) return apiError(res, 400, "Invalid or outdated reservation QR");
    if (!reservation || !canManageLot(req.user, reservation.lot)) return apiError(res, 404, "Reservation not found for a facility you manage");
    if (!["confirmed", "paid"].includes(reservation.status) || reservation.checkedInAt) return apiError(res, 409, "This booking has already been used, cancelled, or is not confirmed");
    const now = new Date();
    if (now < new Date(reservation.start.getTime() - 30 * 60 * 1000) || now >= reservation.end) return apiError(res, 409, "This reservation is outside its check-in window");
    reservationId = reservation._id;
    lotId = reservation.lot._id;
    originalClaimStatus = reservation.status;
    const user = await User.findOneAndUpdate({ _id: reservation.user, $or: [{ activeReservation: null }, { activeReservation: { $exists: false } }] }, { $set: { activeReservation: reservation._id } }, { new: true });
    if (!user) return apiError(res, 409, "This driver already has an active parking session");
    userClaimed = true;
    const lotUpdate = await Lot.updateOne({ _id: lotId, occupied: { $lt: reservation.lot.totalSpots }, reservationClaims: { $elemMatch: { reservationId, status: originalClaimStatus } } }, { $inc: { occupied: 1 }, $set: { "reservationClaims.$.status": "active" } });
    if (!lotUpdate.modifiedCount) return apiError(res, 409, "The reserved capacity is no longer available");
    lotClaimed = true;
    const checkedIn = await Reservation.findOneAndUpdate({ _id: reservationId, status: originalClaimStatus, checkedInAt: { $exists: false } }, { $set: { status: "active", startedAt: now, checkedInAt: now, checkedInBy: req.user._id } }, { new: true }).populate("lot");
    if (!checkedIn) return apiError(res, 409, "This booking was already checked in or changed state");
    res.json({ success: true, valid: true, checkedIn: true, reservation: { reservationId: String(checkedIn._id), bookingReference: checkedIn.bookingReference, status: checkedIn.status, paymentStatus: checkedIn.payment?.status || "due", amount: checkedIn.amount, start: checkedIn.start, end: checkedIn.end, lot: checkedIn.lot?.name, vehicle: checkedIn.vehicle?.plate } });
  } catch (err) {
    console.error("Reservation check-in failed", err);
    apiError(res, 500, "Unable to check in this reservation right now");
  } finally {
    if (lotClaimed && reservationId) {
      const stillConfirmed = await Reservation.exists({ _id: reservationId, status: originalClaimStatus, checkedInAt: { $exists: false } }).catch(() => false);
      if (stillConfirmed) await Lot.updateOne({ _id: lotId, "reservationClaims.reservationId": reservationId, "reservationClaims.status": "active" }, { $inc: { occupied: -1 }, $set: { "reservationClaims.$.status": originalClaimStatus } }).catch(() => {});
    }
    if (userClaimed && reservationId) {
      const checkedIn = await Reservation.exists({ _id: reservationId, status: "active", checkedInAt: { $exists: true } }).catch(() => false);
      if (!checkedIn) await User.updateOne({ activeReservation: reservationId }, { $set: { activeReservation: null } }).catch(() => {});
    }
  }
});

/* ── List user reservations ── */
reservationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    await expireUserHolds(req.user._id);
    const list = await Reservation.find({ user: req.user._id }).populate("lot").sort({ createdAt: -1 });
    // Add qrPayload to each reservation so TripsPage can show booking reference
    res.json(list.map((r) => addQrPayload(r)));
  } catch (err) { console.error("Reservation list failed", err); apiError(res, 500, "Unable to load reservations right now"); }
});

/* ── Single reservation ── */
reservationsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    await expireUserHolds(req.user._id);
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id }).populate("lot");
    if (!reservation) return apiError(res, 404, "Reservation not found");
    res.json(addQrPayload(reservation));
  } catch (err) { console.error("Reservation lookup failed", err); apiError(res, 500, "Unable to load this reservation right now"); }
});

/* ── Create reservation (hold) ── */
reservationsRouter.post("/", requireAuth, async (req, res) => {
  let reservationId, claimLotId;
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
    // Default to "car" if no type provided — matching existing vehicle model
    const vehicleType = String(vehicle?.type || "car").toLowerCase();
    if (!lot.vehicleTypes?.includes(vehicleType)) return apiError(res, 400, "This facility does not support your vehicle type");
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
    const bookingReference = crypto.randomBytes(8).toString("hex").toUpperCase();
    const reservation = await Reservation.create({ _id: reservationId, user: req.user._id, lot: lot._id, start: startDate, end: endDate, vehicle: { plate: selectedVehicle.plate, make: selectedVehicle.make }, status: "held", amount, priceBreakdown, durationHours: hours, expiresAt, bookingReference });
    res.status(201).json(addQrPayload(await reservation.populate("lot")));
  } catch (err) {
    if (reservationId && claimLotId) await Lot.updateOne({ _id: claimLotId }, { $pull: { reservationClaims: { reservationId } } }).catch(() => {});
    console.error("Reservation creation failed", err);
    apiError(res, 500, "Unable to create this reservation right now");
  }
});

/* ── Confirm reservation (held → confirmed) ── */
reservationsRouter.post("/:id/confirm", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    await expireUserHolds(req.user._id);
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id }).populate("lot");
    if (!reservation) return apiError(res, 404, "Reservation not found");
    if (["confirmed", "paid"].includes(reservation.status)) return res.json(addQrPayload(reservation));
    if (reservation.status !== "held" || !reservation.expiresAt || reservation.expiresAt <= new Date()) return apiError(res, 409, "This reservation hold has expired.");
    const confirmed = await Reservation.findOneAndUpdate({ _id: reservation._id, user: req.user._id, status: "held", expiresAt: { $gt: new Date() } }, { $set: { status: "confirmed", "payment.method": "online_mock", "payment.status": "due" }, $unset: { expiresAt: 1 } }, { new: true }).populate("lot");
    if (!confirmed) return apiError(res, 409, "This reservation hold has expired.");
    await Lot.updateOne({ _id: reservation.lot._id, "reservationClaims.reservationId": reservation._id }, { $set: { "reservationClaims.$.status": "confirmed", "reservationClaims.$.expiresAt": null } });
    res.json(addQrPayload(confirmed));
  } catch (err) { console.error("Reservation confirmation failed", err); apiError(res, 500, "Unable to confirm this reservation right now"); }
});

/* ── Mock online payment (confirmed → paid) ── */
reservationsRouter.post("/:id/pay", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id }).populate("lot");
    if (!reservation) return apiError(res, 404, "Reservation not found");
    if (reservation.status === "paid") return res.json(addQrPayload(reservation)); // idempotent
    if (reservation.status !== "confirmed") return apiError(res, 409, "Only a confirmed reservation can be paid.");
    // Simulate transaction ID for mock payment
    const transactionId = `TXN${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const paid = await Reservation.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "confirmed" },
      { $set: {
        status: "paid",
        "payment.method": "online_mock",
        "payment.status": "paid_online",
        "payment.settledAt": new Date(),
        "payment.transactionId": transactionId,
      }},
      { new: true }
    ).populate("lot");
    if (!paid) return apiError(res, 409, "Payment could not be processed for this reservation.");
    res.json(addQrPayload(paid));
  } catch (err) {
    console.error("Mock payment failed", err);
    apiError(res, 500, "Unable to process payment right now");
  }
});

/* ── Cancel reservation ── */
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

/* ── Record on-site payment (owner records cash/POS payment) ── */
reservationsRouter.post("/:id/settle", requireAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return apiError(res, 400, "Invalid reservation id");
    const existing = await Reservation.findById(req.params.id).populate("lot", "ownerOrganization");
    if (!existing || !canManageLot(req.user, existing.lot)) return apiError(res, 404, "Reservation not found for a facility you manage");
    const settled = await Reservation.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["confirmed", "paid", "active", "completed"] }, "payment.status": { $ne: "paid_at_facility" } },
      { $set: { "payment.method": "pay_at_facility", "payment.status": "paid_at_facility", "payment.settledAt": new Date(), "payment.settledBy": req.user._id } },
      { new: true }
    );
    if (!settled) return apiError(res, 409, "This reservation is not eligible for settlement or was already marked paid.");
    res.json({ success: true, reservation: settled });
  } catch (err) { console.error("On-site settlement failed", err); apiError(res, 500, "Unable to record the on-site payment"); }
});

/* ── Extend session ── */
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
      res.json(addQrPayload(saved));
    } catch (err) {
      await Lot.updateOne({ _id: reservation.lot._id, "reservationClaims.reservationId": reservation._id }, { $set: { "reservationClaims.$.end": previousEnd } }).catch(() => {});
      throw err;
    }
  } catch (err) { console.error("Reservation extension failed", err); apiError(res, 500, "Unable to extend this session right now"); }
});

/* Disabled direct-start — facility staff must scan QR */
reservationsRouter.post("/:id/start", requireAuth, async (_req, res) => apiError(res, 403, "Facility staff must scan the booking QR to check in this driver."));
reservationsRouter.post("/:id/end",   requireAuth, async (_req, res) => apiError(res, 403, "Ask the facility attendant to check out this parking session."));
