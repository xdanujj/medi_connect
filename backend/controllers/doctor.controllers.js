import { Availability } from "../models/availability.models.js";
import { Doctor } from "../models/doctor.models.js";
import { generateSlotsFromAvailability } from "../utils/slotGenerator.js";
import { asyncHandler } from "../utils/asyncHandler.js"; // Assuming you have this
import { ApiError } from "../utils/ApiError.js";       // Assuming you have this
import { ApiResponse } from "../utils/ApiResponse.js"; // Assuming you have this

export const setAvailability = asyncHandler(async (req, res) => {
  const doctorId = req.user?._id;

  // 1. Verify Doctor Approval
  const doctorProfile = await Doctor.findOne({ userId: doctorId });
  if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");
  if (!doctorProfile.approved) throw new ApiError(403, "Doctor not approved yet");

  const { date, isAvailable, startTime, endTime, breaks } = req.body;

  if (!date) throw new ApiError(400, "Date is required");

  // 2. Handle 'Unavailable' Case
  if (isAvailable === false) {
    const availability = await Availability.findOneAndUpdate(
      { doctorId, date },
      {
        doctorId,
        date,
        isAvailable: false,
        startTime: null,
        endTime: null,
        breaks: [],
      },
      { upsert: true, new: true }
    );
    
    // Clear slots
    await generateSlotsFromAvailability(availability);

    return res.status(200).json(
      new ApiResponse(200, availability, "Doctor marked unavailable")
    );
  }

  // 3. Validation
  if (!startTime || !endTime) throw new ApiError(400, "Start and end time required");
  if (startTime >= endTime) throw new ApiError(400, "Start time must be before end time");

  // Validate Breaks
  if (breaks && breaks.length > 0) {
    // Sort breaks to easily check overlapping
    const sortedBreaks = [...breaks].sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 0; i < sortedBreaks.length; i++) {
      const br = sortedBreaks[i];
      if (br.startTime >= br.endTime) throw new ApiError(400, "Break start must be before break end");
      if (br.startTime < startTime || br.endTime > endTime) throw new ApiError(400, "Break must be within clinic hours");
      
      // Check overlap with next break
      if (i < sortedBreaks.length - 1) {
         if (br.endTime > sortedBreaks[i + 1].startTime) {
            throw new ApiError(400, "Breaks cannot overlap");
         }
      }
    }
  }

  // 4. Save Availability
  const availability = await Availability.findOneAndUpdate(
    { doctorId, date },
    {
      doctorId,
      date,
      isAvailable: true,
      startTime,
      endTime,
      breaks: breaks || [],
    },
    { upsert: true, new: true }
  );

  // 5. Generate Slots
  // This function now handles the break logic and insertion
  await generateSlotsFromAvailability(availability);

  return res
    .status(200)
    .json(new ApiResponse(200, availability, "Availability set and slots generated successfully"));
});