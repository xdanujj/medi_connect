import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "locked", "booked", "unavailable", "expired"],
      default: "available",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

slotSchema.index({ doctorId: 1, startDateTime: 1 }, { unique: true });

export const Slot = mongoose.model("Slot", slotSchema);
