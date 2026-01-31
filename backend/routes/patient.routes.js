import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { register } from "../controllers/patient.controllers.js";


const router=Router()


router.route("/register").post(
    upload.fields([
        {
            name: "profilePhoto",
            maxCount: 1
        }
    ]),
    register
    )


export default router