import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createServices,
  getAppointments,
  getServices,
  setAvailability,
  getAppointmentsToday,
  markAttendance,
} from "../controllers/doctor.controllers.js";
import {
  transcribeAudio,
  extractMedicalData,
  generatePrescription,
  getDoctorPrescriptions,
} from "../controllers/consultation.controllers.js";

const router = Router();

// Availability
router.post("/set-availability", verifyJWT, setAvailability);

// Appointments
router.get("/getAppointments", verifyJWT, getAppointments);
router.get("/appointments/today", verifyJWT, getAppointmentsToday);
router.patch("/appointments/:appointmentId/attendance", verifyJWT, markAttendance);

// Services
router.get("/services", verifyJWT, getServices);
router.put("/services", verifyJWT, createServices);

// Consultation workflow
router.post("/consultation/transcribe", verifyJWT, upload.single("audio"), transcribeAudio);
router.post("/consultation/extract", verifyJWT, extractMedicalData);
router.post("/consultation/generate-prescription", verifyJWT, generatePrescription);

// Prescriptions archive
router.get("/prescriptions", verifyJWT, getDoctorPrescriptions);

export default router;

