import mongoose from "mongoose";
import { Appointment } from "../models/appointment.models.js";
import { Doctor } from "../models/doctor.models.js";
import { Patient } from "../models/patient.models.js";
import { Payment } from "../models/payment.models.js";
import { Service } from "../models/services.models.js";
import { Slot } from "../models/slot.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";

const DEFAULT_HOLD_MINUTES = 10;
const ALLOWED_HOLD_MINUTES = new Set([5, 10]);

/* -------------------------------------------------------------------------- */
/*                                HELPERS                                     */
/* -------------------------------------------------------------------------- */

const ensurePatient = async (user) => {
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

const getHoldMinutes = (requestedMinutes) => {
  const parsed = Number(requestedMinutes);
  return ALLOWED_HOLD_MINUTES.has(parsed) ? parsed : DEFAULT_HOLD_MINUTES;
};

const releaseExpiredLocks = async (doctorId = null) => {
  const now = new Date();

  const query = {
    status: "locked",
    lockExpiry: { $lte: now },
  };

  if (doctorId) {
    query.doctorId = doctorId;
  }

  await Slot.updateMany(query, {
    $set: {
      status: "available",
      lockedBy: null,
      lockExpiry: null,
      lastStatusChange: now,
    },
  });
};

/* -------------------------------------------------------------------------- */
/*                      GET VERIFIED DOCTORS WITH SLOTS                       */
/* -------------------------------------------------------------------------- */

const getVerifiedAvailableDoctors = asyncHandler(async (_, res) => {
  // 1. Get the current real UTC time from the server
  const now = new Date();
  const currentIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  // Create the 'Literal IST' comparison date
  const comparisonTime = new Date(
    Date.UTC(
      currentIST.getUTCFullYear(),
      currentIST.getUTCMonth(),
      currentIST.getUTCDate(),
      currentIST.getUTCHours(),
      currentIST.getUTCMinutes(),
      0,
    ),
  );
  await releaseExpiredLocks();

  // 4. Query slots starting from 'now' in IST
  const slotStats = await Slot.aggregate([
    {
      $match: {
        status: "available",
        isActive: true,
        // This line is the key! It hides the 6:00 PM slot because 6:42 PM > 6:00 PM
        startDateTime: { $gte: comparisonTime },
      },
    },

    {
      $group: {
        _id: "$doctorId",
        availableSlotsCount: { $sum: 1 },
        nextAvailableSlot: { $min: "$startDateTime" },
      },
    },
    { $sort: { nextAvailableSlot: 1 } }, // Sort by earliest availability
  ]);

  if (slotStats.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No doctors currently available"));
  }

  const doctorIds = slotStats.map((stat) => stat._id);

  const doctors = await Doctor.find({
    _id: { $in: doctorIds },
    approved: true,
  })
    .select("name specialization description clinic profilePhoto")
    .lean();

  const slotMap = new Map(slotStats.map((stat) => [String(stat._id), stat]));
  const serviceStats = await Service.aggregate([
    {
      $match: {
        doctorId: { $in: doctorIds },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$doctorId",
        serviceCount: { $sum: 1 },
        startingFee: { $min: "$price" },
      },
    },
  ]);
  const serviceMap = new Map(
    serviceStats.map((stat) => [String(stat._id), stat]),
  );

  const availableDoctors = doctors
    .map((doctor) => ({
      ...doctor,
      availableSlotsCount:
        slotMap.get(String(doctor._id))?.availableSlotsCount ?? 0,
      nextAvailableSlot: slotMap.get(String(doctor._id))?.nextAvailableSlot,
      serviceCount: serviceMap.get(String(doctor._id))?.serviceCount ?? 0,
      startingFee: serviceMap.get(String(doctor._id))?.startingFee ?? null,
    }))
    .sort(
      (a, b) => new Date(a.nextAvailableSlot) - new Date(b.nextAvailableSlot),
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        availableDoctors,
        "Available doctors fetched successfully",
      ),
    );
});
/* -------------------------------------------------------------------------- */
/*                      GET DOCTOR AVAILABLE SLOTS                            */
/* -------------------------------------------------------------------------- */

const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctor id");
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    approved: true,
  })
    .select("name specialization clinic profilePhoto")
    .lean();

  if (!doctor) {
    throw new ApiError(404, "Verified doctor not found");
  }

  // 1. Get current real time
  const now = new Date();

  // 2. Adjust for IST (Add 5.5 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const currentIST = new Date(now.getTime() + istOffset);

  // 3. Create a 'Literal' date object to match DB storage format
  const comparisonTime = new Date(
    Date.UTC(
      currentIST.getUTCFullYear(),
      currentIST.getUTCMonth(),
      currentIST.getUTCDate(),
      currentIST.getUTCHours(),
      currentIST.getUTCMinutes(),
      0,
    ),
  );

  await releaseExpiredLocks(doctorId);

  // 4. Query using the shifted comparisonTime
  const slots = await Slot.find({
    doctorId,
    status: "available",
    isActive: true,
    startDateTime: { $gte: comparisonTime }, // Now 18:42 will correctly hide 18:00
  })
    .select("startDateTime endDateTime status")
    .sort({ startDateTime: 1 })
    .lean();

  const services = await Service.find({
    doctorId,
    isActive: true,
  })
    .select("name description price duration")
    .sort({ price: 1, name: 1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        doctor,
        services,
        slots,
        totalSlots: slots.length,
      },
      "Doctor slots fetched successfully",
    ),
  );
});
/* -------------------------------------------------------------------------- */
/*                            HOLD SLOT FOR PAYMENT                           */
/* -------------------------------------------------------------------------- */

const holdSlotForPayment = asyncHandler(async (req, res) => {
  const patient = await ensurePatient(req.user);
  const { slotId, holdMinutes } = req.body;

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    throw new ApiError(400, "A valid slotId is required");
  }

  const selectedHoldMinutes = getHoldMinutes(holdMinutes);
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + selectedHoldMinutes * 60 * 1000);

  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      isActive: true,
      startDateTime: { $gte: now },
      $or: [
        { status: "available" },
        { status: "locked", lockExpiry: { $lte: now } },
        {
          status: "locked",
          lockedBy: patient._id,
          lockExpiry: { $gt: now },
        },
      ],
    },
    {
      $set: {
        status: "locked",
        lockedBy: patient._id,
        lockExpiry,
        lastStatusChange: now,
      },
    },
    { new: true },
  ).populate("doctorId", "name specialization clinic approved");

  if (!slot) {
    throw new ApiError(409, "Slot is not available for booking");
  }

  if (!slot.doctorId?.approved) {
    throw new ApiError(400, "Slot belongs to an unverified doctor");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        slotId: slot._id,
        doctor: slot.doctorId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        status: slot.status,
        lockExpiry: slot.lockExpiry,
        holdMinutes: selectedHoldMinutes,
      },
      "Slot locked for payment",
    ),
  );
});

/* -------------------------------------------------------------------------- */
/*                     CONFIRM PAYMENT & BOOK APPOINTMENT                     */
/* -------------------------------------------------------------------------- */



const confirmPaymentAndBookAppointment = asyncHandler(async (req, res) => {
  const patient = await ensurePatient(req.user);

  const {
    slotId,
    amount,
    tokenAmount,
    serviceIds,
    serviceId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    paymentMethod,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
  throw new ApiError(400, "Missing payment details");
}

  if (
    !verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )
  ) {
    throw new ApiError(400, "Invalid payment");
  }

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    throw new ApiError(400, "A valid slotId is required");
  }

  const requestedServiceIds = Array.isArray(serviceIds)
    ? serviceIds
    : serviceId
      ? [serviceId]
      : [];
  const normalizedServiceIds = [...new Set(requestedServiceIds.map(String))];

  if (
    normalizedServiceIds.length === 0 ||
    normalizedServiceIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
  ) {
    throw new ApiError(400, "At least one valid serviceId is required");
  }

  if (!razorpayOrderId) {
    throw new ApiError(400, "razorpayOrderId is required");
  }

  const providedAmount =
    amount === undefined || amount === null || amount === ""
      ? null
      : Number(amount);

  if (
    providedAmount !== null &&
    (!Number.isFinite(providedAmount) || providedAmount <= 0)
  ) {
    throw new ApiError(400, "If amount is provided it must be a valid number");
  }

  const session = await mongoose.startSession();
  let appointment, payment, bookedSlot;

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      const slotToBook = await Slot.findOneAndUpdate(
        {
          _id: slotId,
          isActive: true,
          status: "locked",
          lockedBy: patient._id,
          lockExpiry: { $gt: now },
        },
        {
          $set: {
            status: "booked",
            lockedBy: null,
            lockExpiry: null,
            lastStatusChange: now,
          },
        },
        { new: true, session },
      );

      if (!slotToBook) {
        throw new ApiError(
          409,
          "Slot lock expired or not locked by this patient",
        );
      }

      const doctor = await Doctor.findOne({
        _id: slotToBook.doctorId,
        approved: true,
      })
        .select("_id")
        .session(session);

      if (!doctor) {
        throw new ApiError(404, "Verified doctor not found");
      }

      const matchedServices = await Service.find({
        _id: { $in: normalizedServiceIds },
        doctorId: doctor._id,
        isActive: true,
      }).session(session);

      if (matchedServices.length !== normalizedServiceIds.length) {
        throw new ApiError(404, "One or more selected services were not found");
      }

      const serviceMap = new Map(
        matchedServices.map((service) => [String(service._id), service]),
      );
      const orderedServices = normalizedServiceIds.map((id) =>
        serviceMap.get(String(id)),
      );
      const totalPrice = orderedServices.reduce(
        (sum, service) => sum + service.price,
        0,
      );

      if (providedAmount !== null && providedAmount !== totalPrice) {
        throw new ApiError(
          400,
          `Amount mismatch. Selected services must be paid at ${totalPrice}`,
        );
      }

      const slotDuration = Math.max(
        1,
        Math.round(
          (slotToBook.endDateTime - slotToBook.startDateTime) / (60 * 1000),
        ),
      );
      const bookedServices = orderedServices.map((service) => ({
        serviceId: service._id,
        name: service.name,
        duration:
          Number.isFinite(service.duration) && service.duration > 0
            ? service.duration
            : slotDuration,
        fee: service.price,
      }));
      const totalDuration =
        bookedServices.reduce(
          (sum, service) => sum + (service.duration || 0),
          0,
        ) || slotDuration;

      [appointment] = await Appointment.create(
        [
          {
            patient: patient._id,
            doctor: doctor._id,
            slot: slotToBook._id,
            services: bookedServices,
            service: {
              serviceIds: bookedServices.map((service) => service.serviceId),
              name: bookedServices.map((service) => service.name).join(", "),
              duration: totalDuration,
              fee: totalPrice,
            },
            startDateTime: slotToBook.startDateTime,
            endDateTime: slotToBook.endDateTime,
            status: "confirmed",
            paymentStatus: "paid",
            statusHistory: [{ status: "confirmed", changedBy: "patient" }],
          },
        ],
        { session },
      );

      [payment] = await Payment.create(
        [
          {
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            amount: totalPrice,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            status: "completed",
            paymentMethod,
            paidAt: now,
            ...(Number(tokenAmount) > 0 && {
              tokenAmount: Number(tokenAmount),
            }),
          },
        ],
        { session },
      );

      bookedSlot = await Slot.findByIdAndUpdate(
        slotToBook._id,
        { $set: { appointment: appointment._id } },
        { new: true, session },
      );
    });
  } finally {
    await session.endSession();
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { appointment, payment, slot: bookedSlot },
        "Payment confirmed and appointment booked successfully",
      ),
    );
});

/* -------------------------------------------------------------------------- */

export {
  confirmPaymentAndBookAppointment,
  getDoctorAvailableSlots,
  getVerifiedAvailableDoctors,
  holdSlotForPayment,
};
