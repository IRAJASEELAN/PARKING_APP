import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  primaryOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  phone: { type: String, required: true, trim: true, maxlength: 24 },
  address: { type: String, trim: true, maxlength: 240, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewNote: { type: String, maxlength: 500, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

export const Organization = mongoose.model("Organization", organizationSchema);
