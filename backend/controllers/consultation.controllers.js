import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Doctor } from "../models/doctor.models.js";
import { Patient } from "../models/patient.models.js";
import { Appointment } from "../models/appointment.models.js";
import { Prescription } from "../models/prescription.models.js";
import { uploadFileToS3 } from "../utils/s3.js";
import { sendPushNotification } from "../utils/firebase.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* -------------------------------------------------------------------------- */
/*                                HELPERS                                     */
/* -------------------------------------------------------------------------- */

const ensureDoctor = async (user) => {
  if (!user?._id) throw new ApiError(401, "Unauthorized");
  if (user.role !== "doctor") throw new ApiError(403, "Only doctors can perform this action");
  const doctor = await Doctor.findOne({ userId: user._id });
  if (!doctor) throw new ApiError(404, "Doctor profile not found");
  return doctor;
};

/* -------------------------------------------------------------------------- */
/*                    STEP 1 — TRANSCRIBE AUDIO (Sarvam STT)                  */
/* -------------------------------------------------------------------------- */

export const transcribeAudio = asyncHandler(async (req, res) => {
  await ensureDoctor(req.user);

  const audioFile = req.file;
  if (!audioFile) throw new ApiError(400, "No audio file provided");

  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:5000";
  let transcript = "";
  let translatedTranscript = "";

  try {
    const sttForm = new FormData();
    sttForm.append("file", fs.createReadStream(audioFile.path), {
      filename: audioFile.originalname || "audio.webm",
      contentType: audioFile.mimetype || "audio/webm",
    });

    const aiRes = await fetch(`${aiServiceUrl}/transcribe`, {
      method: "POST",
      body: sttForm,
      headers: sttForm.getHeaders(),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new ApiError(aiRes.status, `AI Prescription Service transcription failed: ${errBody}`);
    }

    const aiData = await aiRes.json();
    transcript = aiData.transcript || "";
    translatedTranscript = aiData.translatedTranscript || "";
  } finally {
    // Always clean up temp file
    if (audioFile.path && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { transcript, translatedTranscript }, "Audio transcribed and translated successfully")
  );
});

/* -------------------------------------------------------------------------- */
/*               STEP 2 — EXTRACT MEDICAL DATA (Gemini)                       */
/* -------------------------------------------------------------------------- */

export const extractMedicalData = asyncHandler(async (req, res) => {
  await ensureDoctor(req.user);

  const { translatedTranscript } = req.body;
  if (!translatedTranscript?.trim()) {
    throw new ApiError(400, "translatedTranscript is required");
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:5000";

  const aiRes = await fetch(`${aiServiceUrl}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ translatedTranscript }),
  });

  if (!aiRes.ok) {
    const errBody = await aiRes.text();
    throw new ApiError(aiRes.status, `AI Prescription Service extraction failed: ${errBody}`);
  }

  const extractedData = await aiRes.json();

  return res.status(200).json(
    new ApiResponse(200, extractedData, "Medical data extracted successfully")
  );
});

/* -------------------------------------------------------------------------- */
/*            STEP 3 — GENERATE PRESCRIPTION PDF & STORE                      */
/* -------------------------------------------------------------------------- */

export const generatePrescription = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctor(req.user);
  const { appointmentId, transcript, translatedTranscript, verifiedData } = req.body;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new ApiError(400, "Invalid appointmentId");
  }
  if (!verifiedData) {
    throw new ApiError(400, "verifiedData is required");
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctor._id,
  });
  if (!appointment) {
    throw new ApiError(404, "Appointment not found or does not belong to this doctor");
  }

  const patient = await Patient.findById(appointment.patient);
  if (!patient) throw new ApiError(404, "Patient not found");

  // ── Generate PDF ──
  const pdfPath = path.join("./public/temp", `prescription_${appointmentId}_${Date.now()}.pdf`);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const accentColor = "#06b6d4";
    const darkColor = "#0a0e1a";
    const textColor = "#1e293b";
    const mutedColor = "#64748b";

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 110).fill(darkColor);
    doc.fillColor(accentColor).fontSize(22).font("Helvetica-Bold")
      .text("MediConnect", 50, 28);
    doc.fillColor("#f1f5f9").fontSize(9).font("Helvetica")
      .text("Digital Health Platform", 50, 55);

    doc.fillColor(accentColor).fontSize(16).font("Helvetica-Bold")
      .text("PRESCRIPTION", 0, 30, { align: "right", width: doc.page.width - 50 });
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
      .text(`Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 0, 52, { align: "right", width: doc.page.width - 50 });

    doc.moveDown(3);

    // ── Doctor Info ──
    doc.fillColor(accentColor).fontSize(13).font("Helvetica-Bold")
      .text(`Dr. ${doctor.name}`, 50);
    doc.fillColor(mutedColor).fontSize(9).font("Helvetica")
      .text(doctor.specialization || "");
    if (doctor.clinic?.name) {
      doc.text(`${doctor.clinic.name}${doctor.clinic.city ? ", " + doctor.clinic.city : ""}`);
    }

    // Divider
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(accentColor).lineWidth(1.5).stroke();
    doc.moveDown(0.5);

    // ── Patient Info Box ──
    const boxY = doc.y;
    doc.rect(50, boxY, doc.page.width - 100, 60).fillAndStroke("#f8fafc", "#e2e8f0");
    doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold")
      .text("Patient Information", 62, boxY + 8);
    doc.font("Helvetica").fontSize(9).fillColor(textColor);
    const patientName = verifiedData.patientName || patient.name || "N/A";
    const age = verifiedData.age || (patient.age ? String(patient.age) : "N/A");
    const gender = verifiedData.gender || patient.gender || "N/A";
    doc.text(`Name: ${patientName}    |    Age: ${age}    |    Gender: ${gender}`, 62, boxY + 26);
    doc.fillColor(mutedColor).text(
      `Appointment: ${new Date(appointment.startDateTime).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}`,
      62,
      boxY + 42
    );
    doc.y = boxY + 70;
    doc.moveDown(0.5);

    // Helper for section header
    const sectionHeader = (label) => {
      doc.moveDown(0.4);
      doc.rect(50, doc.y, doc.page.width - 100, 20).fill(accentColor);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(label.toUpperCase(), 58, doc.y - 14);
      doc.moveDown(0.8);
      doc.fillColor(textColor).font("Helvetica").fontSize(9);
    };

    const field = (label, value) => {
      if (!value) return;
      doc.fillColor(mutedColor).font("Helvetica-Bold").fontSize(8).text(`${label}:`, { continued: true });
      doc.fillColor(textColor).font("Helvetica").fontSize(9).text(` ${value}`);
    };

    // ── Clinical Details ──
    sectionHeader("Clinical Details");
    field("Chief Complaint", verifiedData.chiefComplaint);
    field("Diagnosis", verifiedData.diagnosis);
    field("Medical History", verifiedData.medicalHistory);

    // ── Medications ──
    if (verifiedData.medicines?.length > 0) {
      sectionHeader("Medications Prescribed");
      verifiedData.medicines.forEach((med, i) => {
        if (!med.name) return;
        doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(9)
          .text(`${i + 1}. ${med.name}`, { indent: 10 });
        doc.fillColor(textColor).font("Helvetica").fontSize(8)
          .text(
            `   Dosage: ${med.dosage || "—"}   |   Frequency: ${med.frequency || "—"}   |   Duration: ${med.duration || "—"}`,
            { indent: 10 }
          );
        doc.moveDown(0.2);
      });
    }

    // ── Tests & Advice ──
    sectionHeader("Tests & Advice");
    field("Tests Recommended", verifiedData.tests);
    field("Advice / Precautions", verifiedData.advice);
    field("Actions to Take", verifiedData.actions);
    field("Follow-up Date", verifiedData.followUpDate);
    field("Additional Notes", verifiedData.additionalNotes);

    // ── Signature ──
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fillColor(mutedColor).fontSize(7).font("Helvetica")
      .text("This prescription is digitally generated by MediConnect. Please verify with your doctor before use.", { align: "center" });
    doc.fillColor(accentColor).fontSize(8).font("Helvetica-Bold")
      .text(`Dr. ${doctor.name}`, 0, doc.y + 4, { align: "right", width: doc.page.width - 50 });

    doc.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  // ── Upload PDF to S3 ──
  const s3Url = await uploadFileToS3(pdfPath, "application/pdf");

  // ── Save Prescription Document ──
  const prescription = await Prescription.create({
    appointment: appointment._id,
    doctor: doctor._id,
    patient: patient._id,
    transcript: transcript || "",
    translatedTranscript: translatedTranscript || "",
    extractedData: verifiedData,
    verifiedData,
    pdfUrl: s3Url,
    generatedAt: new Date(),
  });

  // ── Send FCM Notification to Patient ──
  if (patient.fcmToken) {
    await sendPushNotification({
      token: patient.fcmToken,
      title: "Prescription Ready 🩺",
      body: `Dr. ${doctor.name} has generated your prescription. Tap to view and download.`,
      data: { prescriptionId: String(prescription._id), type: "prescription" },
    });
  }

  return res.status(201).json(
    new ApiResponse(201, prescription, "Prescription generated and saved successfully")
  );
});

/* -------------------------------------------------------------------------- */
/*              GET DOCTOR'S PRESCRIPTIONS ARCHIVE                            */
/* -------------------------------------------------------------------------- */

export const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctor(req.user);

  const prescriptions = await Prescription.find({
    doctor: doctor._id,
    isActive: true,
  })
    .populate("patient", "name age gender phone profilePhoto")
    .populate("appointment", "startDateTime endDateTime service")
    .sort({ generatedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, prescriptions, "Doctor prescriptions fetched successfully")
  );
});
