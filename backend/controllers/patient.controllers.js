import { Appointment } from "../models/appointment.models.js";
import { Patient } from "../models/patient.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getPatientProfile = async (user) => {
  if (!user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (user.role !== "patient") {
    throw new ApiError(403, "Only patients can perform this action");
  }

  const patient = await Patient.findOne({ userId: user._id });

  if (!patient) {
    throw new ApiError(404, "Patient profile not found");
  }

  return patient;
};

const getAppointments = asyncHandler(async (req, res) => {
  const patient = await getPatientProfile(req.user);

  const appointments = await Appointment.find({
    patient: patient._id,
    isActive: true,
  })
    .populate("doctor", "name specialization clinic profilePhoto")
    .populate("slot", "startDateTime endDateTime status")
    .sort({ startDateTime: -1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      appointments,
      "Patient appointments fetched successfully",
    ),
  );
});

export { getAppointments };
