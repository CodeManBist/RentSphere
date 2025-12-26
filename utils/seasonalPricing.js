// Seasonal Pricing Calculator Utility
// Calculates dynamic pricing based on seasons and day of week

const SEASONAL_CONFIG = {
  peak: {
    name: "Peak Season",
    multiplier: 1.3, // +30%
    months: [12, 1], // December-January
  },
  summer: {
    name: "Summer Season",
    multiplier: 1.2, // +20%
    months: [4, 5], // April-May
  },
  monsoon: {
    name: "Monsoon Drop",
    multiplier: 0.85, // -15%
    months: [7, 8], // July-August
  },
  regular: {
    name: "Regular Season",
    multiplier: 1.0,
    months: [2, 3, 6, 9, 10, 11],
  },
}

const WEEKEND_MULTIPLIER = 1.1 // +10% on weekends

/**
 * Get the season for a specific date
 * @param {Date} date
 * @returns {Object} Season info with name and multiplier
 */
function getSeasonForDate(date) {
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed

  for (const [key, season] of Object.entries(SEASONAL_CONFIG)) {
    if (season.months.includes(month)) {
      return { key, ...season }
    }
  }

  return { key: "regular", ...SEASONAL_CONFIG.regular }
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday = 0, Saturday = 6
}

/**
 * Get the multiplier for a specific date
 * @param {Date} date
 * @returns {Object} { multiplier, seasonName, isWeekend }
 */
function getMultiplierForDate(date) {
  const season = getSeasonForDate(date)
  let multiplier = season.multiplier
  const weekend = isWeekend(date)

  // Apply weekend surcharge on top of seasonal pricing
  if (weekend) {
    multiplier *= WEEKEND_MULTIPLIER
  }

  return {
    multiplier: Math.round(multiplier * 100) / 100, // Round to 2 decimals
    seasonName: season.name,
    isWeekend: weekend,
  }
}

/**
 * Calculate total price with seasonal adjustments
 * @param {Number} baseNightlyRate - Base price per night
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {Object} Pricing breakdown
 */
function calculateSeasonalPrice(baseNightlyRate, checkIn, checkOut) {
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))

  if (nights <= 0) {
    throw new Error("Invalid date range")
  }

  const breakdown = []
  let totalPrice = 0
  let totalMultiplier = 0

  // Calculate price for each night
  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(checkInDate)
    currentDate.setDate(currentDate.getDate() + i)

    const { multiplier, seasonName, isWeekend } = getMultiplierForDate(currentDate)
    const nightRate = Math.round(baseNightlyRate * multiplier)

    breakdown.push({
      date: currentDate,
      rate: nightRate,
      seasonName: isWeekend ? `${seasonName} (Weekend)` : seasonName,
      multiplier,
    })

    totalPrice += nightRate
    totalMultiplier += multiplier
  }

  const averageMultiplier = Math.round((totalMultiplier / nights) * 100) / 100
  const basePrice = baseNightlyRate * nights
  const seasonalAdjustment = totalPrice - basePrice

  return {
    nights,
    baseNightlyRate,
    basePrice,
    seasonalAdjustment,
    averageMultiplier,
    subtotal: totalPrice,
    breakdown,
  }
}

/**
 * Get current season info
 * @returns {Object} Current season details
 */
function getCurrentSeason() {
  return getSeasonForDate(new Date())
}

/**
 * Get all seasons configuration
 * @returns {Object} All seasons config
 */
function getSeasonsConfig() {
  return SEASONAL_CONFIG
}

module.exports = {
  getSeasonForDate,
  isWeekend,
  getMultiplierForDate,
  calculateSeasonalPrice,
  getCurrentSeason,
  getSeasonsConfig,
  WEEKEND_MULTIPLIER,
}
