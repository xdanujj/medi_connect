import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAppointments, getPatientPrescriptions, updateFcmToken } from "../controllers/patient.controllers.js";

const router = Router();

router.get("/appointments", verifyJWT, getAppointments);
router.get("/prescriptions", verifyJWT, getPatientPrescriptions);
router.patch("/fcm-token", verifyJWT, updateFcmToken);

export default router;
