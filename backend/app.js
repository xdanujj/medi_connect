import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import { ApiError } from "./utils/ApiError.js";

import authRouter from "./routes/auth.routes.js";
import doctorRouter from "./routes/doctor.routes.js";
import patientRouter from "./routes/patient.routes.js";
import appointmentRouter from "./routes/appointment.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/appointment", appointmentRouter);
app.use("/api/v1/doctor", doctorRouter);
app.use("/api/v1/patient", patientRouter);
app.use("/api/v1/auth", authRouter);

app.use((req, _, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

app.use((err, _, res, __) => {
  const statusCode = err?.statusCode || 500;

  res.status(statusCode).json({
    statusCode,
    data: null,
    message: err?.message || "Internal server error",
    success: false,
    errors: err?.errors || [],
  });
});

export { app };
