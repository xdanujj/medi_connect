import cookieParser from "cookie-parser"
import express from "express"
import cors from "cors"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json())
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import authRouter from "./routes/auth.routes.js";

import doctorRouter from "./routes/doctor.routes.js";

app.use("/api/v1/doctor", doctorRouter);

app.use("/api/v1/auth",authRouter);

export {app};