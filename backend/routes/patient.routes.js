import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAppointments } from "../controllers/patient.controllers.js";
const router = Router();

router.get("/appointments", verifyJWT, getAppointments);

export default router;
