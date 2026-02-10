import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"

//import {verifyJWT} from "../middlewares/auth.middleware.js";
import { login, register } from "../controllers/patient.controllers.js";

const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"profilePhoto",
            maxCount:1,
        }
    ]),
    register
)

router.route("/login").post(login);

export default router