// Availability Checker Utility
// Prevents double bookings using overlap detection

const Booking = require("../Models/booking")

/**
 * Check if two date ranges overlap
 * Uses the formula: (checkIn < existingCheckOut) AND (checkOut > existingCheckIn)
 * @param {Date} checkIn1
 * @param {Date} checkOut1
 * @param {Date} checkIn2
 * @param {Date} checkOut2
 * @returns {boolean}
 */
function datesOverlap(checkIn1, checkOut1, checkIn2, checkOut2) {
  return checkIn1 < checkOut2 && checkOut1 > checkIn2
}

/**
 * Get all blocked dates for a listing
 * @param {String} listingId
 * @returns {Array} Array of { checkIn, checkOut, bookingId, status }
 */
async function getBlockedDates(listingId) {
  const bookings = await Booking.find({
    listing: listingId,
    status: { $in: ["paid", "pending_approval", "confirmed"] },
  }).select("checkIn checkOut _id status")

  return bookings.map((b) => ({
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    bookingId: b._id,
    status: b.status,
  }))
}

/**
 * Check availability for a listing
 * @param {String} listingId
 * @param {Date} checkIn
 * @param {Date} checkOut
 * @param {String} excludeBookingId - Optional booking ID to exclude (for modifications)
 * @returns {Object} { available: boolean, conflicts: Array }
 */
async function checkAvailability(listingId, checkIn, checkOut, excludeBookingId = null) {
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  // Validate dates
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { available: false, error: "Invalid dates", conflicts: [] }
  }

  if (checkInDate >= checkOutDate) {
    return { available: false, error: "Check-out must be after check-in", conflicts: [] }
  }

  if (checkInDate < new Date().setHours(0, 0, 0, 0)) {
    return { available: false, error: "Cannot book dates in the past", conflicts: [] }
  }

  // Find conflicting bookings
  const query = {
    listing: listingId,
    status: { $in: ["paid", "pending_approval", "confirmed"] },
    $and: [{ checkIn: { $lt: checkOutDate } }, { checkOut: { $gt: checkInDate } }],
  }

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId }
  }

  const conflictingBookings = await Booking.find(query).select("checkIn checkOut status").lean()

  return {
    available: conflictingBookings.length === 0,
    conflicts: conflictingBookings,
  }
}

/**
 * Get available date ranges for next N days
 * @param {String} listingId
 * @param {Number} daysAhead - Number of days to check (default 90)
 * @returns {Array} Array of available date ranges
 */
async function getAvailableDateRanges(listingId, daysAhead = 90) {
  const blockedDates = await getBlockedDates(listingId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + daysAhead)

  // Sort blocked dates by check-in
  blockedDates.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))

  const availableRanges = []
  let currentStart = today

  for (const blocked of blockedDates) {
    const blockedStart = new Date(blocked.checkIn)
    const blockedEnd = new Date(blocked.checkOut)

    if (blockedStart > currentStart) {
      availableRanges.push({
        start: new Date(currentStart),
        end: new Date(blockedStart),
      })
    }

    if (blockedEnd > currentStart) {
      currentStart = blockedEnd
    }
  }

  // Add remaining dates until end
  if (currentStart < endDate) {
    availableRanges.push({
      start: new Date(currentStart),
      end: endDate,
    })
  }

  return availableRanges
}

/**
 * Get calendar data for a listing (for frontend display)
 * @param {String} listingId
 * @param {Number} months - Number of months to return (default 3)
 * @returns {Object} Calendar data with blocked and available dates
 */
async function getCalendarData(listingId, months = 3) {
  const blockedDates = await getBlockedDates(listingId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const calendarData = []

  for (let m = 0; m < months; m++) {
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + m, 1)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const isPast = date < today

      // Check if this date is blocked
      let isBlocked = false
      for (const blocked of blockedDates) {
        if (date >= new Date(blocked.checkIn) && date < new Date(blocked.checkOut)) {
          isBlocked = true
          break
        }
      }

      days.push({
        date,
        day: d,
        isBlocked,
        isPast,
        available: !isBlocked && !isPast,
      })
    }

    calendarData.push({
      year,
      month,
      monthName: currentMonth.toLocaleString("default", { month: "long" }),
      days,
    })
  }

  return calendarData
}

module.exports = {
  datesOverlap,
  getBlockedDates,
  checkAvailability,
  getAvailableDateRanges,
  getCalendarData,
}
