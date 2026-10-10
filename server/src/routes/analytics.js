import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { Lot } from "../models/Lot.js";
import { Reservation } from "../models/Reservation.js";
export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireAdmin);
analyticsRouter.get("/overview", async (_req, res) => {
  try {
    const [lots, reservations, revenue, reservationsByHour] = await Promise.all([
      Lot.aggregate([{ $group: { _id: "$neighborhood", facilities: { $sum: 1 }, spaces: { $sum: "$totalSpots" }, occupied: { $sum: "$occupied" } } }, { $sort: { occupied: -1 } }]),
      Reservation.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]),
      Reservation.aggregate([{ $match: { "payment.status": "paid_at_facility" } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, amount: { $sum: "$amount" } } }, { $sort: { _id: 1 } }, { $limit: 30 }]),
      Reservation.aggregate([{ $match: { "payment.status": "paid_at_facility" } }, { $group: { _id: { $hour: "$start" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    res.json({ success: true, isDemoEstimate: true, demandByArea: lots, reservationsByDay: reservations, revenueByDay: revenue, reservationsByHour });
  } catch (err) { console.error("Analytics overview failed", err); res.status(500).json({ success: false, message: "Unable to load analytics" }); }
});
analyticsRouter.get("/occupancy", async (_req, res) => {
  try { const lots = await Lot.aggregate([{ $group: { _id: "$neighborhood", spaces: { $sum: "$totalSpots" }, occupied: { $sum: "$occupied" } } }]); res.json({ success: true, isDemoEstimate: true, areas: lots }); }
  catch (err) { console.error("Occupancy analytics failed", err); res.status(500).json({ success: false, message: "Unable to load occupancy analytics" }); }
});
analyticsRouter.get("/reservations", async (_req, res) => {
  try { const days = await Reservation.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]); res.json({ success: true, isDemoEstimate: true, days }); }
  catch (err) { console.error("Reservation analytics failed", err); res.status(500).json({ success: false, message: "Unable to load reservation analytics" }); }
});
analyticsRouter.get("/revenue", async (_req, res) => {
  try { const days = await Reservation.aggregate([{ $match: { "payment.status": "paid_at_facility" } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, amount: { $sum: "$amount" } } }, { $sort: { _id: 1 } }, { $limit: 30 }]); res.json({ success: true, isDemoEstimate: true, days }); }
  catch (err) { console.error("Revenue analytics failed", err); res.status(500).json({ success: false, message: "Unable to load revenue analytics" }); }
});
