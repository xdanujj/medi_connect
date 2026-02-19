import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getDoctorAvailableSlots, } from "../controllers/appointment.controllers.js";
const router = Router();


export default router;
