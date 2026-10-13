import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true },
    make: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ["driver", "owner", "admin"], default: "driver" },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
    passwordHash: { type: String, required: true },
    activeReservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", default: null },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
    vehicles: { type: [vehicleSchema], default: [] },
    savedPlaces: {
      home: { type: String, default: "" },
      work: { type: String, default: "" },
    },
    permissions: {
      location: { type: Boolean, default: false },
      notifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    organizationId: this.organizationId,
    vehicles: this.vehicles,
    savedPlaces: this.savedPlaces,
    permissions: this.permissions,
  };
};

export const User = mongoose.model("User", userSchema);


