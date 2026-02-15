import express from "express";
import {
  registerDoctor,
  registerPatient,
  loginUser,
  logoutUser,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = express.Router();

router.post(
  "/signup/doctor",
  upload.fields([
    { name: "licensePdf", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]),
  registerDoctor,
);

router.post(
  "/signup/patient",

  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),

  registerPatient,
);

router.post("/login", loginUser);


router.post("/logout", verifyJWT, logoutUser);

export default router;
