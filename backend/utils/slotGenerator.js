import { Slot } from "../models/slot.models.js";

export const generateSlotsFromAvailability = async (
  availability,
  slotDuration = 15 // default 15 mins
) => {
  const { doctorId, date, isAvailable, startTime, endTime, breaks } = availability;

  if (!doctorId || !date) {
    console.log("Missing doctorId or date");
    return;
  }

  // 1. Setup Date boundaries (Using UTC to avoid timezone shifts)
  const baseDate = new Date(date);
  
  // Set explicit start/end of the day in UTC to catch all slots for that specific date
  const startOfDay = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 23, 59, 59));

  // 2. Delete OLD slots (Safe Mode: Only delete 'available' slots)
  // We do NOT want to delete 'booked' slots if the doctor changes their schedule.
  await Slot.deleteMany({
    doctorId,
    startDateTime: { $gte: startOfDay, $lte: endOfDay },
    status: "available", 
  });

  if (!isAvailable) {
    console.log("Doctor unavailable. Open slots cleared.");
    return;
  }

  if (!startTime || !endTime) return;

  // 3. Convert Times to Minutes
  const parseTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const startTotalMinutes = parseTimeToMinutes(startTime);
  const endTotalMinutes = parseTimeToMinutes(endTime);

  if (startTotalMinutes >= endTotalMinutes) return;

  const slotsToInsert = [];

  // 4. Loop through minutes to generate slots
  for (
    let currentMinutes = startTotalMinutes;
    currentMinutes + slotDuration <= endTotalMinutes;
    currentMinutes += slotDuration
  ) {
    const currentEndMinutes = currentMinutes + slotDuration;

    // 5. Check for Break Overlaps
    const isInBreak = breaks?.some((br) => {
      const breakStart = parseTimeToMinutes(br.startTime);
      const breakEnd = parseTimeToMinutes(br.endTime);

      // Check if the slot overlaps with the break interval
      // (Slot Starts before Break Ends) AND (Slot Ends after Break Starts)
      return currentMinutes < breakEnd && currentEndMinutes > breakStart;
    });

    if (isInBreak) continue;

    // 6. Create Date Objects (UTC)
    // We construct the specific date-time for the slot
    const slotStartDate = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      Math.floor(currentMinutes / 60),
      currentMinutes % 60
    ));

    const slotEndDate = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      Math.floor(currentEndMinutes / 60),
      currentEndMinutes % 60
    ));

    // 7. Check if a 'booked' slot already exists at this time (Prevent double booking)
    const existingSlot = await Slot.findOne({
      doctorId,
      startDateTime: slotStartDate,
      status: { $ne: "available" } // If status is booked/locked
    });

    if (existingSlot) {
      continue; // Skip creating a new slot if a booking exists here
    }

    slotsToInsert.push({
      doctorId,
      startDateTime: slotStartDate,
      endDateTime: slotEndDate,
      status: "available",
    });
  }

  // 8. Bulk Insert
  if (slotsToInsert.length > 0) {
    await Slot.insertMany(slotsToInsert);
    console.log(`Generated ${slotsToInsert.length} slots for doctor ${doctorId}`);
  }
};