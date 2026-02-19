import { Availability } from "../models/availability.models.js";
import { Doctor } from "../models/doctor.models.js";
import { generateSlotsFromAvailability } from "../utils/slotGenerator.js";
import { asyncHandler } from "../utils/asyncHandler.js"; // Assuming you have this
import { ApiError } from "../utils/ApiError.js"; // Assuming you have this
import { ApiResponse } from "../utils/ApiResponse.js"; // Assuming you have this
import { Appointment } from "../models/appointment.models.js";
// Helper to validate 24-hour HH:mm format
const isValid24HourFormat = (timeStr) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);

export const setAvailability = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const doctorProfile = await Doctor.findOne({ userId });
  if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");
  if (!doctorProfile.approved) throw new ApiError(403, "Doctor not approved");

  const { date, isAvailable, startTime, endTime, breaks } = req.body;

  if (!date) throw new ApiError(400, "Date is required");

  //  If doctor marks unavailable for the whole day
  if (isAvailable === false) {
    const availability = await Availability.findOneAndUpdate(
      { doctorId: doctorProfile._id, date },
      {
        doctorId: doctorProfile._id,
        date,
        isAvailable: false,
        startTime: null,
        endTime: null,
        breaks: [],
      },
      { upsert: true, new: true },
    );

    await generateSlotsFromAvailability(availability);

    return res
      .status(200)
      .json(new ApiResponse(200, availability, "Doctor marked unavailable"));
  }

  if (!startTime || !endTime) {
    throw new ApiError(400, "Start and end time required");
  }

  // Validate 24-hour format
  if (!isValid24HourFormat(startTime) || !isValid24HourFormat(endTime)) {
    throw new ApiError(400, "Times must be in 24-hour format (HH:mm)");
  }

  if (startTime >= endTime) {
    throw new ApiError(400, "Start time must be before end time");
  }

  //  Validate breaks
  if (breaks && breaks.length > 0) {
    const sortedBreaks = [...breaks].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    for (let i = 0; i < sortedBreaks.length; i++) {
      const br = sortedBreaks[i];

      if (
        !isValid24HourFormat(br.startTime) ||
        !isValid24HourFormat(br.endTime)
      ) {
        throw new ApiError(
          400,
          "Break times must be in 24-hour format (HH:mm)",
        );
      }

      if (br.startTime >= br.endTime) {
        throw new ApiError(400, "Break start must be before break end");
      }

      if (br.startTime < startTime || br.endTime > endTime) {
        throw new ApiError(400, "Break must be within clinic hours");
      }

      if (i < sortedBreaks.length - 1) {
        if (br.endTime > sortedBreaks[i + 1].startTime) {
          throw new ApiError(400, "Breaks cannot overlap");
        }
      }
    }
  }

  const availability = await Availability.findOneAndUpdate(
    { doctorId: doctorProfile._id, date },
    {
      doctorId: doctorProfile._id,
      date,
      isAvailable: true,
      startTime,
      endTime,
      breaks: breaks || [],
    },
    { upsert: true, new: true },
  );

  await generateSlotsFromAvailability(availability);

  return res
    .status(200)
    .json(
      new ApiResponse(200, availability, "Availability set & slots generated"),
    );
});

export const getAppointments = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const doctor = await Doctor.findOne({ userId }).select("_id");
  if (!doctor) throw new ApiError(404, "Doctor profile not found");

  const appointments = await Appointment.find({ doctor: doctor._id })
    .populate("patient", "name age")
    .populate("slot", "startDateTime endDateTime");

  return res.status(200).json(
    new ApiResponse(
      200,
      appointments,
      "Doctor appointments fetched successfully"
    )
  );
});
