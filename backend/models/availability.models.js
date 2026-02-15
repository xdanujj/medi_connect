import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true
    },

    date: {
      type: Date,
      required: true
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    startTime: {
      type: String // "09:00"
    },

    endTime: {
      type: String
    },

    breaks: [
      {
        startTime: {
          type: String
        },
        endTime: {
          type: String
        }
      }
    ]
  },
  { timestamps: true }
);

availabilitySchema.index(
  { doctorId: 1, date: 1 },
  { unique: true }
);

export const Availability = mongoose.model(
  "Availability",
  availabilitySchema
);
