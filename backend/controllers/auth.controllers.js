import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { generateAccessAndRefreshTokens } from "../utils/generateAccessRefreshToken.js";
import { Patient } from "../models/patient.models.js";
import { Doctor } from "../models/doctor.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      "Login successful",
    ),
  );
});


const registerDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    number,
    description,
    specialization,
    clinicName,
    address,
    city,
    state,
    pincode,
    latitude,
    longitude,
  } = req.body;

  // 🔎 Validate required fields
  if (!name || !number || !specialization || !clinicName) {
    throw new ApiError(400, "Required fields are missing");
  }

  // 🔐 Check if doctor profile already exists for this user
  const existingDoctor = await Doctor.findOne({ userId: req.user._id });
  if (existingDoctor) {
    throw new ApiError(400, "Doctor profile already exists");
  }

  // 📄 Check license PDF
  if (!req.files?.licensePdf?.[0]) {
    throw new ApiError(400, "License PDF is required");
  }

  // ☁️ Upload license PDF
  const licenseUpload = await uploadOnCloudinary(
    req.files.licensePdf[0].path,
    "mediconnect/doctors/licenses",
  );

  if (!licenseUpload) {
    throw new ApiError(500, "License upload failed");
  }

  // 🖼 Optional profile photo
  let profilePhotoUrl = null;

  if (req.files?.profilePhoto?.[0]) {
    const profileUpload = await uploadOnCloudinary(
      req.files.profilePhoto[0].path,
      "mediconnect/doctors/profiles",
    );

    profilePhotoUrl = profileUpload?.secure_url || null;
  }

  // 🏥 Create doctor profile
  const doctor = await Doctor.create({
    userId: req.user._id,
    name,
    number,
    description,
    specialization,
    clinic: {
      name: clinicName,
      location: {
        address,
        city,
        state,
        pincode,
        coordinates: {
          latitude,
          longitude,
        },
      },
    },
    licensePdf: licenseUpload.secure_url,
    profilePhoto: profilePhotoUrl,
    approved: false, // 🔒 Admin must approve
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        doctor,
        "Doctor registered successfully. Awaiting admin approval.",
      ),
    );
});

const registerPatient = asyncHandler(async (req, res) => {
  const { email, password, name, phone, age, gender } = req.body;
  console.log(req.body);
  console.log(req.files);

  if (!email || !password || !name || !gender || !phone || !age) {
    throw new ApiError(400, "Enter all necessary fields!");
  }

  const existingUser = await User.findOne({
    $or: [{ name }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    email,
    password,
    role: "patient",
  });

  const profilePhotoPath = req.files?.profilePhoto?.[0]?.path;
  if (!profilePhotoPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  const profilePhoto = await uploadOnCloudinary(profilePhotoPath);
  if (!profilePhoto) {
    throw new ApiError(400, "Upload Failed!");
  }

  await Patient.create({
    userId: user._id,
    name,
    phone,
    age,
    gender,
    profilePhoto: profilePhoto.url,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "User Registration Failed!");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully!"));
});

export { loginUser, registerDoctor, registerPatient };