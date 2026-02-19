import { Slot } from "../models/slot.models.js";

/**
 * Generate slots from doctor availability
 * Parses 24-hour time and stores literal IST times directly into MongoDB.
 */
export const generateSlotsFromAvailability = async (
  availability,
  slotDuration = 15
) => {
  const { doctorId, date, isAvailable, startTime, endTime, breaks } = availability;

  if (!doctorId || !date) return;

  const baseDate = new Date(date);

  const parseTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Delete all existing slots for that day to prevent duplicates
  const startOfDay = new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    0, 0, 0
  ));

  const endOfDay = new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    23, 59, 59
  ));

  await Slot.deleteMany({
    doctorId,
    startDateTime: { $gte: startOfDay, $lte: endOfDay }
  });

  if (!isAvailable) return;

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes >= endMinutes) return;

  const slotsToInsert = [];

  for (
    let current = startMinutes;
    current + slotDuration <= endMinutes;
    current += slotDuration
  ) {
    const slotEnd = current + slotDuration;

    // Check if the current slot overlaps with any break
    const inBreak = breaks?.some((br) => {
      const breakStart = parseTimeToMinutes(br.startTime);
      const breakEnd = parseTimeToMinutes(br.endTime);
      // If slot starts before break ends AND slot ends after break starts = Overlap
      return current < breakEnd && slotEnd > breakStart;
    });

    // Store the literal time directly (Bypassing UTC conversion so DB shows IST time)
    const slotStartDB = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      Math.floor(current / 60),
      current % 60
    ));

    const slotEndDB = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      Math.floor(slotEnd / 60),
      slotEnd % 60
    ));

    slotsToInsert.push({
      doctorId,
      startDateTime: slotStartDB,
      endDateTime: slotEndDB,
      status: inBreak ? "unavailable" : "available",
      isActive: !inBreak, 
    });
  }

  if (slotsToInsert.length > 0) {
    await Slot.insertMany(slotsToInsert);
  }
};