import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    // 🔗 Link to User (auth & role)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // ===== FILLED BY DOCTOR =====
    name: {
      type: String,
      required: true,
      trim: true
    },

    specialization: {
      type: String,
      enum: [
        "General Physician",
        "Cardiologist",
        "Dermatologist",
        "Pediatrician",
        "Orthopedic",
        "Neurologist",
        "Psychiatrist",
        "ENT Specialist",
        "Gynecologist",
        "Dentist",
        "Ophthalmologist",
        "Other"
      ],
      required: true
    },

    clinic: {
      name: {
        type: String,
        required: true
      },

      location: {
        address: String,
        city: String,
        state: String,
        pincode: String,

        coordinates: {
          latitude: Number,
          longitude: Number
        }
      }
    },

    licensePdf: {
      type: String, // Cloudinary / S3 URL
      required: true
    },

    profilePhoto: {
      type: String
    },

    // ===== ADMIN CONTROL ONLY =====
    approved: {
      type: Boolean,
      default: false
    },

    approvedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);
