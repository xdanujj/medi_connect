import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    // Raw STT output from Sarvam
    transcript: {
      type: String,
    },

    // Translated English transcript
    translatedTranscript: {
      type: String,
    },

    // Structured medical data extracted by Gemini
    extractedData: {
      patientName: String,
      age: String,
      gender: String,
      chiefComplaint: String,
      diagnosis: String,
      medicalHistory: String,
      medicines: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
        },
      ],
      tests: String,
      advice: String,
      followUpDate: String,
      actions: String,
      additionalNotes: String,
    },

    // Final verified data (doctor-confirmed before PDF generation)
    verifiedData: {
      patientName: String,
      age: String,
      gender: String,
      chiefComplaint: String,
      diagnosis: String,
      medicalHistory: String,
      medicines: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
        },
      ],
      tests: String,
      advice: String,
      followUpDate: String,
      actions: String,
      additionalNotes: String,
    },

    // Cloudinary PDF details
    pdfUrl: {
      type: String,
    },

    pdfPublicId: {
      type: String,
    },

    generatedAt: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ patient: 1, createdAt: -1 });

export const Prescription = mongoose.model("Prescription", prescriptionSchema);
