import express from "express";
import {
  registerDoctor,
  registerPatient,
  loginUser,
  logoutUser
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup/doctor", registerDoctor);
router.post("/signup/patient", registerPatient);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

export default router;
