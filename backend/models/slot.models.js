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
      enum: [
        "available",
        "locked",
        "booked",
        "unavailable",
        "expired"
      ],
      default: "available",
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
    },

    lockExpiry: {
      type: Date,
      default: null,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastStatusChange: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 🔐 Prevent duplicate slots
slotSchema.index(
  { doctorId: 1, startDateTime: 1 },
  { unique: true }
);

// ⚡ Fast booking queries
slotSchema.index(
  { doctorId: 1, status: 1, startDateTime: 1 }
);

export const Slot = mongoose.model("Slot", slotSchema);
