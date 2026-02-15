import { Router } from "express";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { setAvailability } from "../controllers/doctor.controllers.js";
const router=Router();

router.post("/set-availability", verifyJWT, setAvailability);

export default router