import mongoose from "mongoose";
const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
  start: { type: Date, required: true }, end: { type: Date, required: true },
  vehicle: { plate: String, make: String },
  status: { type: String, enum: ["held", "confirmed", "paid", "active", "completed", "cancelled", "expired"], default: "held" },
  amount: Number, durationHours: Number, expiresAt: Date,
  bookingReference: { type: String, unique: true, sparse: true },
  checkedInAt: Date, checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedSlot: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSlot", default: null },
  priceBreakdown: { parkingFee: Number, serviceFee: Number, total: Number, currency: { type: String, default: "INR" } },
  payment: {
    method: { type: String, enum: ["pay_at_facility", "online_mock"] },
    status: { type: String, enum: ["due", "paid_at_facility", "paid_online"], default: "due" },
    settledAt: Date,
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    transactionId: { type: String, default: null },
  },
  startedAt: Date, endedAt: Date,
}, { timestamps: true });
reservationSchema.index({ lot: 1, start: 1, end: 1, status: 1 });
reservationSchema.index({ user: 1, status: 1, start: 1 });
export const Reservation = mongoose.model("Reservation", reservationSchema);
