import mongoose from "mongoose";

const reservationClaimSchema = new mongoose.Schema({
  reservationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  expiresAt: Date,
  status: { type: String, enum: ["held", "confirmed", "paid", "active"], required: true },
}, { _id: false });

const lotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, shortName: String, address: String, neighborhood: String,
    ownerOrganization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved", index: true },
    approvalNote: { type: String, maxlength: 500, default: "" },
    geo: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } },
    rates: { firstHour: Number, additional: Number, dailyMax: Number, hourly: Number },
    amenities: [String], hours: { type: String, default: "Open 24/7" }, safetyScore: Number, driverRating: Number,
    photoUrl: String, totalSpots: Number, occupied: Number, isDemoData: { type: Boolean, default: true }, entrance: String, entranceHint: String,
    reviewQuote: String, reviewAuthor: String, reviewCount: Number, walkMin: Number, driveMin: Number, walkMi: Number,
    occupancySource: { type: String, enum: ["simulation", "manual", "sensor", "camera", "unknown"], default: "unknown" }, occupancyUpdatedAt: { type: Date, default: null },
    reservable: { type: Boolean, default: true }, vehicleTypes: { type: [String], default: ["car", "suv", "motorcycle", "van"] },
    pinColor: { type: String, default: "green" },
    reservationClaims: { type: [reservationClaimSchema], default: [] },
  },
  { timestamps: true }
);
lotSchema.index({ geo: "2dsphere" });
lotSchema.virtual("available").get(function available() { return Math.max(0, this.totalSpots - this.occupied); });
lotSchema.set("toJSON", { virtuals: true });
lotSchema.set("toObject", { virtuals: true });
export const Lot = mongoose.model("Lot", lotSchema);


