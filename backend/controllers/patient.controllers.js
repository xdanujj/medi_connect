import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import { Patient } from "../models/patient.models.js";
import { generateAccessAndRefreshTokens } from "../utils/generateAccessRefreshToken.js";

const register = asyncHandler(async (req, res) => {
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



export { register};
