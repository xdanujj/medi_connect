import { Patient } from "../models/patient.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
//import jwt from "jsonwebtoken";
//import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateRefreshAndAccessTokens = asyncHandler(async (req, res) => {});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, age, gender } = req.body;

  // Validation
  if (
    [name, email, password, gender].some(
      (field) => !field || field.trim() === "",
    ) ||
    !age ||
    !phone
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check existing patient
  const existedPatient = await Patient.findOne({ email });
  if (existedPatient) {
    throw new ApiError(409, "User already exists");
  }

  // File handling
  const profilePhotoLocalPath =
    req.files && req.files.profilePhoto && req.files.profilePhoto.length > 0
      ? req.files.profilePhoto[0].path
      : null;

  if (!profilePhotoLocalPath) {
    throw new ApiError(400, "Profile Photo is required");
  }
    console.log("Uploading file from:", profilePhotoLocalPath);

  const profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);
  if (!profilePhoto?.url) {
    throw new ApiError(400, "Profile Photo upload failed");
  }

  // Create patient
  const patient = await Patient.create({
    profilePhoto: profilePhoto.url,
    name,
    email,
    password,
    age,
    gender,
    phone,
    role: "PATIENT",
  });

  const createdPatient = await Patient.findById(patient._id).select(
    "-password -refreshToken",
  );

  return res
    .status(201)
    .json(
      new ApiResponse(200, createdPatient, "Patient registered successfully"),
    );
});

export { register };
