import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },

    service: {
      name: String,
      duration: Number,
      fee: Number,
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
        "pending",
        "confirmed",
        "reschedule-required",
        "cancelled",
        "attended",
        "no-show",
        "expired"
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    
    cancellationReason: String,

    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "admin"],
    },

    cancelledAt: Date,

    attendedAt: Date,

    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    rescheduledAt: Date,

    // 🔥 Audit trail
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔐 Prevent double booking
appointmentSchema.index(
  { doctor: 1, startDateTime: 1 },
  { unique: true }
);

// Fast dashboard queries
appointmentSchema.index({ doctor: 1, status: 1, startDateTime: 1 });
appointmentSchema.index({ patient: 1, startDateTime: 1 });

export const Appointment = mongoose.model(
  "Appointment",
  appointmentSchema
);
