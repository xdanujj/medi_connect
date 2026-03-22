import { Availability } from "../models/availability.models.js";
import { Doctor } from "../models/doctor.models.js";
import { Service } from "../models/services.models.js";
import { generateSlotsFromAvailability } from "../utils/slotGenerator.js";
import { asyncHandler } from "../utils/asyncHandler.js"; // Assuming you have this
import { ApiError } from "../utils/ApiError.js"; // Assuming you have this
import { ApiResponse } from "../utils/ApiResponse.js"; // Assuming you have this
import { Appointment } from "../models/appointment.models.js";

// Helper to validate 24-hour HH:mm format
const isValid24HourFormat = (timeStr) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);

const getDoctorProfile = async (user) => {
  if (!user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  if (user.role !== "doctor") {
    throw new ApiError(403, "Only doctors can perform this action");
  }

  const doctorProfile = await Doctor.findOne({ userId: user._id });

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  return doctorProfile;
};

export const setAvailability = asyncHandler(async (req, res) => {
  const doctorProfile = await getDoctorProfile(req.user);
  if (!doctorProfile.approved) {
    throw new ApiError(403, "Doctor not approved");
  }
 
  const { date, isAvailable, startTime, endTime, breaks } = req.body;
 
  if (!date) throw new ApiError(400, "Date is required");
 
  // 🔧 Helper
  const timeToMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
 
  // =========================
  // ❌ FULL DAY UNAVAILABLE
  // =========================
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
        isOvernight: false,
      },
      { upsert: true, new: true }
    );
 
    await generateSlotsFromAvailability(availability);
 
    return res
      .status(200)
      .json(new ApiResponse(200, availability, "Doctor marked unavailable"));
  }
 
  // =========================
  // 🔍 BASIC VALIDATION
  // =========================
  if (!startTime || !endTime) {
    throw new ApiError(400, "Start and end time required");
  }
 
  if (!isValid24HourFormat(startTime) || !isValid24HourFormat(endTime)) {
    throw new ApiError(400, "Times must be in 24-hour format (HH:mm)");
  }
 
  if (startTime === endTime) {
    throw new ApiError(400, "Start time and end time cannot be the same");
  }
 
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
 
  // If end <= start, it's an overnight shift (e.g. 22:00 → 06:00)
  const isOvernight = end <= start;
 
  // =========================
  // 🔥 BREAK VALIDATION
  // =========================
  if (breaks && breaks.length > 0) {
    for (const br of breaks) {
      if (
        !isValid24HourFormat(br.startTime) ||
        !isValid24HourFormat(br.endTime)
      ) {
        throw new ApiError(400, "Break times must be in 24-hour format (HH:mm)");
      }
 
      const brStart = timeToMinutes(br.startTime);
      const brEnd = timeToMinutes(br.endTime);
 
      // Cross-midnight breaks are not allowed for UX simplicity
      if (brEnd <= brStart) {
        throw new ApiError(
          400,
          "Break cannot cross midnight. Please split into two."
        );
      }
 
      if (!isOvernight) {
        // Normal same-day: break must sit fully inside [start, end]
        if (brStart < start || brEnd > end) {
          throw new ApiError(400, "Break must be within clinic hours");
        }
      } else {
        // Overnight: working hours span [start, 1440) ∪ [0, end)
        // Break must fall fully in one of those two segments
        const inFirstPart = brStart >= start; // start → midnight
        const inSecondPart = brEnd <= end;     // midnight → end
 
        if (!inFirstPart && !inSecondPart) {
          throw new ApiError(400, "Break must be within clinic hours");
        }
      }
    }
 
    // Check overlaps: sort by startTime and ensure no two breaks overlap
    const sortedBreaks = [...breaks].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
 
    for (let i = 1; i < sortedBreaks.length; i++) {
      const prevBreakEnd = timeToMinutes(sortedBreaks[i - 1].endTime);
      const currBreakStart = timeToMinutes(sortedBreaks[i].startTime);
      if (currBreakStart < prevBreakEnd) {
        throw new ApiError(400, "Breaks cannot overlap");
      }
    }
  }
 
  // =========================
  // ✅ SAVE
  // =========================
  const availability = await Availability.findOneAndUpdate(
    { doctorId: doctorProfile._id, date },
    {
      doctorId: doctorProfile._id,
      date,
      isAvailable: true,
      startTime,
      endTime,
      breaks: breaks || [],
      isOvernight,
    },
    { upsert: true, new: true }
  );
 
  // =========================
  // ⚡ GENERATE SLOTS
  // =========================
  await generateSlotsFromAvailability(availability);
 
  return res.status(200).json(
    new ApiResponse(
      200,
      availability,
      "Availability set & slots generated successfully"
    )
  );
});
 

export const getAppointments = asyncHandler(async (req, res) => {
  const doctor = await getDoctorProfile(req.user);

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

export const getServices = asyncHandler(async (req, res) => {
  const doctor = await getDoctorProfile(req.user);

  const services = await Service.find({
    doctorId: doctor._id,
    isActive: true,
  })
    .sort({ price: 1, name: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, services, "Doctor services fetched successfully"));
});

export const createServices = asyncHandler(async (req, res) => {
  const doctor = await getDoctorProfile(req.user);
  const { services } = req.body;

  if (!Array.isArray(services)) {
    throw new ApiError(400, "services must be an array");
  }

  const seenServiceNames = new Set();
  const normalizedServices = services.map((service, index) => {
    const name = service?.name?.trim();
    const description =
      typeof service?.description === "string" ? service.description.trim() : "";
    const price = Number(service?.price);
    const rawDuration = service?.duration;

    if (!name) {
      throw new ApiError(400, `Service name is required for item ${index + 1}`);
    }

    const normalizedName = name.toLowerCase();
    if (seenServiceNames.has(normalizedName)) {
      throw new ApiError(400, `Duplicate service name: ${name}`);
    }
    seenServiceNames.add(normalizedName);

    if (!Number.isFinite(price) || price <= 0) {
      throw new ApiError(400, `A valid price is required for ${name}`);
    }

    const normalizedService = {
      doctorId: doctor._id,
      name,
      price,
      isActive: true,
    };

    if (description) {
      normalizedService.description = description;
    }

    if (rawDuration !== undefined && rawDuration !== null && rawDuration !== "") {
      const duration = Number(rawDuration);

      if (!Number.isInteger(duration) || duration <= 0) {
        throw new ApiError(
          400,
          `Duration must be a positive whole number for ${name}`,
        );
      }

      normalizedService.duration = duration;
    }

    return normalizedService;
  });

  const session = await Service.startSession();
  let createdServices = [];

  try {
    await session.withTransaction(async () => {
      await Service.updateMany(
        { doctorId: doctor._id, isActive: true },
        { $set: { isActive: false } },
        { session },
      );

      if (normalizedServices.length > 0) {
        createdServices = await Service.insertMany(normalizedServices, {
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      createdServices,
      "Doctor services updated successfully",
    ),
  );
});

