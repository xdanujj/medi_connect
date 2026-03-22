import { Slot } from "../models/slot.models.js";
 
/**
 * Generate slots from doctor availability.
 *
 * All times are stored as UTC-based Date objects where the UTC
 * clock values directly represent the doctor's local (IST) times —
 * i.e. no timezone offset is applied; the DB shows IST wall-clock
 * times directly.
 *
 * Overnight example: startTime = "22:00", endTime = "06:00"
 *   → slots from 22:00 on `date` up to 06:00 on `date + 1`
 */
export const generateSlotsFromAvailability = async (
  availability,
  slotDuration = 15
) => {
  const { doctorId, date, isAvailable, startTime, endTime, breaks, isOvernight } =
    availability;
 
  if (!doctorId || !date) return;
 
  const baseDate = new Date(date);
 
  // Helper: minutes from "HH:mm"
  const parseTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };
 
  // Helper: build a UTC Date for a given day-offset and minute-of-day
  //   dayOffset = 0 → baseDate, dayOffset = 1 → next day
  const buildUTCDate = (dayOffset, minuteOfDay) =>
    new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + dayOffset,
        Math.floor(minuteOfDay / 60),
        minuteOfDay % 60,
        0,
        0
      )
    );
 
  // ─── Delete existing slots ───────────────────────────────────
  // Always clean up the base date. If overnight, also clean the next day.
  await Slot.deleteMany({
    doctorId,
    startDateTime: {
      $gte: buildUTCDate(0, 0),
      $lte: buildUTCDate(0, 23 * 60 + 59),
    },
  });
 
  if (isOvernight) {
    await Slot.deleteMany({
      doctorId,
      startDateTime: {
        $gte: buildUTCDate(1, 0),
        $lte: buildUTCDate(1, 23 * 60 + 59),
      },
    });
  }
 
  if (!isAvailable) return;
 
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
 
  // Total working minutes
  //   Normal    → endMinutes - startMinutes
  //   Overnight → (1440 - startMinutes) + endMinutes
  const totalMinutes = isOvernight
    ? 1440 - startMinutes + endMinutes
    : endMinutes - startMinutes;
 
  if (totalMinutes <= 0) return;
 
  // Pre-parse breaks once.
  // For overnight shifts, breaks in the second segment (after midnight) are
  // shifted by +1440 so all arithmetic stays in a single linear timeline.
  const parsedBreaks = (breaks || []).map((br) => {
    let absStart = parseTimeToMinutes(br.startTime);
    let absEnd = parseTimeToMinutes(br.endTime);
 
    if (isOvernight && absStart < endMinutes) {
      // Break falls in the post-midnight segment → shift into our linear space
      absStart += 1440;
      absEnd += 1440;
    }
 
    return { absStart, absEnd };
  });
 
  const slotsToInsert = [];
 
  for (
    let offset = 0;
    offset + slotDuration <= totalMinutes;
    offset += slotDuration
  ) {
    // Absolute minute on our linear timeline (may exceed 1440 for overnight)
    const absStart = startMinutes + offset;
    const absEnd = absStart + slotDuration;
 
    // Map back to calendar day + minute-of-day
    const startDayOffset = absStart >= 1440 ? 1 : 0;
    const endDayOffset = absEnd > 1440 ? 1 : startDayOffset;
    const slotMinuteStart = absStart % 1440;
    const slotMinuteEnd = absEnd % 1440;
 
    // Overlap check: slot [absStart, absEnd) vs break [absStart, absEnd)
    const inBreak = parsedBreaks.some(
      (br) => absStart < br.absEnd && absEnd > br.absStart
    );
 
    slotsToInsert.push({
      doctorId,
      startDateTime: buildUTCDate(startDayOffset, slotMinuteStart),
      endDateTime: buildUTCDate(endDayOffset, slotMinuteEnd),
      status: inBreak ? "unavailable" : "available",
      isActive: !inBreak,
    });
  }
 
  if (slotsToInsert.length > 0) {
    await Slot.insertMany(slotsToInsert);
  }
};
