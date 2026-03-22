import { Router } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createServices,
  getAppointments,
  getServices,
  setAvailability,
} from "../controllers/doctor.controllers.js";
const router=Router();

router.post("/set-availability", verifyJWT, setAvailability);

router.get("/getAppointments",verifyJWT,getAppointments);

router.get("/services", verifyJWT, getServices);

router.put("/services", verifyJWT, createServices);

export default router
