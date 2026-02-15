import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.models.js";
import { Availability } from "../models/availability.models.js";


export const setAvailability = asyncHandler(async (req, res) => {

  const doctorId = req.user?._id;

  // 1️⃣ Auth check
  if (!doctorId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 2️⃣ Role check
  if (req.user.role !== "doctor") {
    throw new ApiError(403, "Only doctors can set availability");
  }

  // 3️⃣ Approval check
  if (!req.user.isApproved) {
    throw new ApiError(403, "Doctor not approved yet");
  }

  const { date, isAvailable, startTime, endTime, breaks } = req.body;

  if (!date) {
    throw new ApiError(400, "Date is required");
  }

  // 🔴 If doctor marks unavailable
  if (isAvailable === false) {

    const availability = await Availability.findOneAndUpdate(
      { doctorId, date },
      {
        doctorId,
        date,
        isAvailable: false,
        startTime: null,
        endTime: null,
        breaks: []
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(
        200,
        availability,
        "Doctor marked unavailable for selected date"
      ));
  }

  // 🟢 Validate clinic hours
  if (!startTime || !endTime) {
    throw new ApiError(400, "Start and end time required");
  }

  if (startTime >= endTime) {
    throw new ApiError(400, "Start time must be before end time");
  }

  // 🟡 Validate breaks
  if (breaks && breaks.length > 0) {

    for (let br of breaks) {

      if (!br.startTime || !br.endTime) {
        throw new ApiError(400, "Invalid break time");
      }

      if (br.startTime >= br.endTime) {
        throw new ApiError(400, "Break start must be before break end");
      }

      if (br.startTime < startTime || br.endTime > endTime) {
        throw new ApiError(400, "Break must be within clinic hours");
      }
    }

    // Prevent overlapping breaks
    const sortedBreaks = [...breaks].sort(
      (a, b) => a.startTime.localeCompare(b.startTime)
    );

    for (let i = 0; i < sortedBreaks.length - 1; i++) {
      if (sortedBreaks[i].endTime > sortedBreaks[i + 1].startTime) {
        throw new ApiError(400, "Breaks cannot overlap");
      }
    }
  }

  // 💾 Save / Update
  const availability = await Availability.findOneAndUpdate(
    { doctorId, date },
    {
      doctorId,
      date,
      isAvailable: true,
      startTime,
      endTime,
      breaks: breaks || []
    },
    { upsert: true, new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      availability,
      "Availability set successfully"
    ));
});
