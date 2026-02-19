import { Router } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { setAvailability ,getAppointments } from "../controllers/doctor.controllers.js";
const router=Router();

router.post("/set-availability", verifyJWT, setAvailability);

router.get("/getAppointments",verifyJWT,getAppointments);

export default router