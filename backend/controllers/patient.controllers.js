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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email & Password is Required!");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User is not Registered!");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Enter Correct Password!");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "User Logged In Successfully",
      ),
    );
});

export { register, login };
