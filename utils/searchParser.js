/**
 * Advanced Search Query Parser
 * Parses natural language queries into structured search parameters
 */

// Common location aliases and corrections
const LOCATION_ALIASES = {
  bang: "bangalore",
  blr: "bangalore",
  bengaluru: "bangalore",
  del: "delhi",
  mum: "mumbai",
  hyd: "hyderabad",
  chen: "chennai",
  kol: "kolkata",
  pune: "pune",
  goa: "goa",
  jaipur: "jaipur",
  udaipur: "udaipur",
  shimla: "shimla",
  manali: "manali",
  ooty: "ooty",
  coorg: "coorg",
  munnar: "munnar",
  mysore: "mysuru",
  mysuru: "mysuru",
}

// Category keyword mappings
const CATEGORY_KEYWORDS = {
  // Stay types
  villa: { parent: "stays", category: "villas" },
  villas: { parent: "stays", category: "villas" },
  house: { parent: "stays", category: "houses" },
  houses: { parent: "stays", category: "houses" },
  apartment: { parent: "stays", category: "apartments" },
  apartments: { parent: "stays", category: "apartments" },
  flat: { parent: "stays", category: "apartments" },
  room: { parent: "stays", category: "private-rooms" },
  rooms: { parent: "stays", category: "private-rooms" },
  "2bhk": { parent: "stays", category: "apartments" },
  "3bhk": { parent: "stays", category: "apartments" },
  farmhouse: { parent: "stays", category: "farm-stays" },
  farm: { parent: "stays", category: "farm-stays" },
  treehouse: { parent: "stays", category: "treehouses" },
  camping: { parent: "stays", category: "camping" },
  tent: { parent: "adventure", category: "tents" },

  // Vehicles
  car: { parent: "vehicles", category: "cars" },
  cars: { parent: "vehicles", category: "cars" },
  bike: { parent: "vehicles", category: "bikes" },
  bikes: { parent: "vehicles", category: "bikes" },
  scooter: { parent: "vehicles", category: "scooters" },
  ev: { parent: "vehicles", category: "evs" },
  electric: { parent: "vehicles", category: "evs" },

  // Equipment
  camera: { parent: "equipment", category: "cameras" },
  drone: { parent: "equipment", category: "drones" },
  lens: { parent: "equipment", category: "lenses" },

  // Adventure
  kayak: { parent: "adventure", category: "kayaks" },
  trek: { parent: "adventure", category: "trekking" },
  trekking: { parent: "adventure", category: "trekking" },

  // Professional
  cowork: { parent: "professional", category: "coworking" },
  coworking: { parent: "professional", category: "coworking" },
  office: { parent: "professional", category: "coworking" },
  studio: { parent: "professional", category: "studios" },
  "event hall": { parent: "professional", category: "event-halls" },
  "meeting room": { parent: "professional", category: "meeting-rooms" },
}

// Amenity keywords
const AMENITY_KEYWORDS = {
  wifi: "wifi",
  "wi-fi": "wifi",
  internet: "wifi",
  pool: "pool",
  swimming: "pool",
  ac: "ac",
  "air conditioning": "ac",
  parking: "parking",
  kitchen: "kitchen",
  gym: "gym",
  fitness: "gym",
  pet: "petsAllowed",
  "pet friendly": "petsAllowed",
  pets: "petsAllowed",
}

// Month mappings for date detection
const MONTHS = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
}

/**
 * Parse a natural language search query into structured parameters
 * @param {string} query - Raw search query
 * @returns {Object} Parsed search parameters
 */
function parseSearchQuery(query) {
  if (!query || typeof query !== "string") {
    return {}
  }

  const originalQuery = query
  const lowerQuery = query.toLowerCase().trim()
  const words = lowerQuery.split(/\s+/)

  const result = {
    keywords: [],
    location: null,
    minPrice: null,
    maxPrice: null,
    parentCategory: null,
    category: null,
    amenities: [],
    guests: null,
    checkIn: null,
    checkOut: null,
    nearMe: false,
    radius: null, // km
    sortBy: "relevance",
  }

  // Detect "near me" queries
  if (lowerQuery.includes("near me") || lowerQuery.includes("nearby")) {
    result.nearMe = true
  }

  // Detect radius patterns: "5km", "10 km", "within 20km"
  const radiusMatch = lowerQuery.match(/(?:within\s+)?(\d+)\s*km/i)
  if (radiusMatch) {
    result.radius = Number.parseInt(radiusMatch[1], 10)
  }

  // Detect price patterns
  // "under 3000", "below 5000", "less than 2000"
  const underMatch = lowerQuery.match(/(?:under|below|less than|max|upto|up to)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i)
  if (underMatch) {
    result.maxPrice = Number.parseInt(underMatch[1], 10)
  }

  // "above 1000", "over 2000", "more than 1500", "min 1000"
  const aboveMatch = lowerQuery.match(/(?:above|over|more than|min|minimum|from)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i)
  if (aboveMatch) {
    result.minPrice = Number.parseInt(aboveMatch[1], 10)
  }

  // Price range: "1000-3000", "1000 to 3000", "between 1000 and 3000"
  const rangeMatch = lowerQuery.match(/(?:rs\.?|₹|inr)?\s*(\d+)\s*(?:-|to|and)\s*(?:rs\.?|₹|inr)?\s*(\d+)/i)
  if (rangeMatch) {
    result.minPrice = Number.parseInt(rangeMatch[1], 10)
    result.maxPrice = Number.parseInt(rangeMatch[2], 10)
  }

  // Detect guest count: "4 guests", "for 6 people", "6 persons"
  const guestMatch = lowerQuery.match(/(\d+)\s*(?:guests?|people|persons?|pax)/i)
  if (guestMatch) {
    result.guests = Number.parseInt(guestMatch[1], 10)
  }

  // Detect month/date patterns
  for (const [monthName, monthIndex] of Object.entries(MONTHS)) {
    if (lowerQuery.includes(monthName)) {
      const year = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      // If the month is in the past, assume next year
      const targetYear = monthIndex < currentMonth ? year + 1 : year
      result.checkIn = new Date(targetYear, monthIndex, 1)
      result.checkOut = new Date(targetYear, monthIndex + 1, 0) // Last day of month
      break
    }
  }

  // Detect category keywords
  for (const [keyword, catInfo] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      result.parentCategory = catInfo.parent
      result.category = catInfo.category
      break
    }
  }

  // Detect amenity keywords
  for (const [keyword, amenity] of Object.entries(AMENITY_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      result.amenities.push(amenity)
    }
  }

  // Detect location - check against known aliases first
  for (const [alias, location] of Object.entries(LOCATION_ALIASES)) {
    if (lowerQuery.includes(alias)) {
      result.location = location
      break
    }
  }

  // If no known location found, try to extract potential location words
  // (words that don't match other patterns)
  if (!result.location) {
    const excludePatterns = [
      /^\d+$/, // pure numbers
      /^(?:under|below|above|over|min|max|near|me|within|km|guests?|people|persons?|pax)$/i,
      /^(?:with|and|or|in|at|for|to|the|a|an)$/i,
      /^(?:january|february|march|april|may|june|july|august|september|october|november|december)$/i,
      /^(?:jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)$/i,
    ]

    // Also exclude known category/amenity keywords
    const allKeywords = [...Object.keys(CATEGORY_KEYWORDS), ...Object.keys(AMENITY_KEYWORDS)]

    const potentialLocations = words.filter((word) => {
      if (word.length < 3) return false
      if (allKeywords.includes(word)) return false
      for (const pattern of excludePatterns) {
        if (pattern.test(word)) return false
      }
      return true
    })

    if (potentialLocations.length > 0) {
      // Take the first potential location word
      result.location = potentialLocations[0]
    }
  }

  // Build keywords array for text search (excluding parsed terms)
  result.keywords = words.filter((word) => {
    if (word.length < 2) return false
    // Exclude common stop words
    if (/^(?:with|and|or|in|at|for|to|the|a|an|is|are|was|were)$/i.test(word)) return false
    return true
  })

  return result
}

/**
 * Build MongoDB query from parsed search parameters
 * @param {Object} params - Parsed search parameters
 * @returns {Object} MongoDB query object
 */
function buildMongoQuery(params) {
  const query = { status: "active" }
  const textSearchTerms = []

  // Location search (fuzzy with regex)
  if (params.location) {
    // Create a fuzzy regex pattern
    const escapedLocation = params.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.$or = query.$or || []
    query.$or.push(
      { location: { $regex: escapedLocation, $options: "i" } },
      { country: { $regex: escapedLocation, $options: "i" } },
      { title: { $regex: escapedLocation, $options: "i" } },
      { description: { $regex: escapedLocation, $options: "i" } },
    )
  }

  // Category filters
  if (params.parentCategory) {
    query.parentCategory = params.parentCategory
  }
  if (params.category) {
    query.category = params.category
  }

  // Price range
  if (params.minPrice || params.maxPrice) {
    query.price = {}
    if (params.minPrice) {
      query.price.$gte = params.minPrice
    }
    if (params.maxPrice) {
      query.price.$lte = params.maxPrice
    }
  }

  // Guest capacity
  if (params.guests) {
    query.maxGuests = { $gte: params.guests }
  }

  // Amenities (pet-friendly, etc.)
  if (params.amenities && params.amenities.length > 0) {
    if (params.amenities.includes("petsAllowed")) {
      query["policies.petsAllowed"] = true
    }
    // Add more amenity filters for categoryFields
    const otherAmenities = params.amenities.filter((a) => a !== "petsAllowed")
    if (otherAmenities.length > 0) {
      query["categoryFields.amenities"] = { $all: otherAmenities }
    }
  }

  // Keywords for text search
  if (params.keywords && params.keywords.length > 0) {
    const keywordPattern = params.keywords.join("|")
    if (!query.$or) {
      query.$or = []
    }
    query.$or.push(
      { title: { $regex: keywordPattern, $options: "i" } },
      { description: { $regex: keywordPattern, $options: "i" } },
    )
  }

  return query
}

/**
 * Build geospatial query for "near me" searches
 * @param {Array} coordinates - [lng, lat]
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Geospatial query object
 */
function buildGeoQuery(coordinates, radiusKm = 10) {
  const radiusInRadians = radiusKm / 6371 // Earth's radius in km

  return {
    geometry: {
      $geoWithin: {
        $centerSphere: [coordinates, radiusInRadians],
      },
    },
  }
}

/**
 * Calculate relevance score for a listing based on search params
 * @param {Object} listing - Listing document
 * @param {Object} params - Parsed search parameters
 * @returns {number} Relevance score (0-100)
 */
function calculateRelevanceScore(listing, params) {
  let score = 0
  const maxScore = 100

  // Text match scoring (40 points max)
  if (params.location) {
    const locationLower = params.location.toLowerCase()
    if (listing.location && listing.location.toLowerCase().includes(locationLower)) {
      score += 20
    }
    if (listing.title && listing.title.toLowerCase().includes(locationLower)) {
      score += 10
    }
    if (listing.description && listing.description.toLowerCase().includes(locationLower)) {
      score += 10
    }
  }

  // Category match (20 points)
  if (params.category && listing.category === params.category) {
    score += 20
  } else if (params.parentCategory && listing.parentCategory === params.parentCategory) {
    score += 10
  }

  // Price fit scoring (20 points)
  if (params.minPrice || params.maxPrice) {
    const price = listing.price
    if (params.minPrice && params.maxPrice) {
      const midRange = (params.minPrice + params.maxPrice) / 2
      const priceDeviation = Math.abs(price - midRange) / midRange
      score += Math.max(0, 20 - priceDeviation * 20)
    } else if (params.maxPrice && price <= params.maxPrice) {
      score += 15
    } else if (params.minPrice && price >= params.minPrice) {
      score += 15
    }
  } else {
    score += 10 // Neutral price score
  }

  // Guest capacity match (10 points)
  if (params.guests && listing.maxGuests >= params.guests) {
    score += 10
  }

  // Keyword match scoring (10 points)
  if (params.keywords && params.keywords.length > 0) {
    const titleLower = (listing.title || "").toLowerCase()
    const descLower = (listing.description || "").toLowerCase()
    const matchedKeywords = params.keywords.filter((kw) => titleLower.includes(kw) || descLower.includes(kw))
    score += Math.min(10, (matchedKeywords.length / params.keywords.length) * 10)
  }

  return Math.min(score, maxScore)
}

/**
 * Get autocomplete suggestions based on partial input
 * @param {string} partial - Partial search input
 * @returns {Array} Suggested completions
 */
function getAutocompleteSuggestions(partial) {
  if (!partial || partial.length < 2) return []

  const lowerPartial = partial.toLowerCase()
  const suggestions = []

  // Location suggestions
  for (const [alias, location] of Object.entries(LOCATION_ALIASES)) {
    if (alias.startsWith(lowerPartial) || location.startsWith(lowerPartial)) {
      suggestions.push({
        type: "location",
        value: location.charAt(0).toUpperCase() + location.slice(1),
        icon: "fa-location-dot",
      })
    }
  }

  // Category suggestions
  for (const [keyword, catInfo] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keyword.startsWith(lowerPartial)) {
      suggestions.push({
        type: "category",
        value: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        parent: catInfo.parent,
        category: catInfo.category,
        icon: "fa-tag",
      })
    }
  }

  // Deduplicate and limit
  const unique = [...new Map(suggestions.map((s) => [s.value, s])).values()]
  return unique.slice(0, 8)
}

module.exports = {
  parseSearchQuery,
  buildMongoQuery,
  buildGeoQuery,
  calculateRelevanceScore,
  getAutocompleteSuggestions,
  LOCATION_ALIASES,
  CATEGORY_KEYWORDS,
  AMENITY_KEYWORDS,
}
