import { Router } from "express";
import {
  getVerifiedAvailableDoctors,
  getDoctorAvailableSlots,
  holdSlotForPayment,
  confirmPaymentAndBookAppointment,
} from "../controllers/appointment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/verified-doctors",verifyJWT, getVerifiedAvailableDoctors);

router.get("/doctor/:doctorId/slots",verifyJWT, getDoctorAvailableSlots);

router.post("/hold", verifyJWT, holdSlotForPayment);

router.post("/confirm", verifyJWT, confirmPaymentAndBookAppointment);

export default router;
