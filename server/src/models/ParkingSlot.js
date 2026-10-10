import mongoose from "mongoose";
const parkingSlotSchema = new mongoose.Schema({
  lotId: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true, index: true },
  slotNumber: { type: String, required: true, trim: true },
  floor: { type: String, default: "Ground" },
  section: { type: String, default: "" },
  vehicleType: { type: String, enum: ["car", "suv", "motorcycle", "van"], default: "car" },
  status: { type: String, enum: ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"], default: "AVAILABLE" },
  isDemoData: { type: Boolean, default: false },
  sensorId: { type: String, default: "" },
}, { timestamps: true });
parkingSlotSchema.index({ lotId: 1, slotNumber: 1 }, { unique: true });
export const ParkingSlot = mongoose.model("ParkingSlot", parkingSlotSchema);
