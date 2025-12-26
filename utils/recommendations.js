// Recommendation Engine Utility
// Suggests similar listings based on price, category, and location

const Listing = require("../Models/listing")

/**
 * Calculate similarity score between two listings
 * @param {Object} listing1
 * @param {Object} listing2
 * @returns {Number} Similarity score (0-100)
 */
function calculateSimilarity(listing1, listing2) {
  let score = 0

  // Same parent category: +40 points
  if (listing1.parentCategory === listing2.parentCategory) {
    score += 40

    // Same sub-category: +20 additional points
    if (listing1.category === listing2.category) {
      score += 20
    }
  }

  // Price similarity: up to +25 points
  const priceDiff = Math.abs(listing1.price - listing2.price)
  const priceAvg = (listing1.price + listing2.price) / 2
  const priceRatio = priceDiff / priceAvg

  if (priceRatio <= 0.1)
    score += 25 // Within 10%
  else if (priceRatio <= 0.25)
    score += 20 // Within 25%
  else if (priceRatio <= 0.5)
    score += 15 // Within 50%
  else if (priceRatio <= 1) score += 10 // Within 100%

  // Location similarity: up to +15 points
  if (listing1.country === listing2.country) {
    score += 10

    // Same city/location
    if (listing1.location && listing2.location && listing1.location.toLowerCase() === listing2.location.toLowerCase()) {
      score += 5
    }
  }

  return score
}

/**
 * Get recommended listings based on a source listing
 * @param {String} listingId - The listing to find recommendations for
 * @param {Number} limit - Maximum number of recommendations (default 6)
 * @returns {Array} Array of recommended listings
 */
async function getRecommendations(listingId, limit = 6) {
  const sourceListing = await Listing.findById(listingId)

  if (!sourceListing) {
    return []
  }

  // Find potential matches
  const candidates = await Listing.find({
    _id: { $ne: listingId },
    status: "active",
    $or: [
      { parentCategory: sourceListing.parentCategory },
      { category: sourceListing.category },
      { country: sourceListing.country },
      {
        price: {
          $gte: sourceListing.price * 0.5,
          $lte: sourceListing.price * 1.5,
        },
      },
    ],
  })
    .populate("owner", "username")
    .limit(50)
    .lean()

  // Score and sort candidates
  const scored = candidates.map((candidate) => ({
    listing: candidate,
    score: calculateSimilarity(sourceListing, candidate),
  }))

  scored.sort((a, b) => b.score - a.score)

  // Return top recommendations
  return scored.slice(0, limit).map((s) => s.listing)
}

/**
 * Get popular listings by category
 * @param {String} parentCategory
 * @param {String} category
 * @param {Number} limit
 * @returns {Array}
 */
async function getPopularByCategory(parentCategory, category = null, limit = 8) {
  const query = {
    status: "active",
    parentCategory,
  }

  if (category) {
    query.category = category
  }

  // In a real app, you'd sort by booking count, reviews, etc.
  // For now, we'll use featured + random
  const listings = await Listing.find(query)
    .populate("owner", "username")
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  return listings
}

/**
 * Get nearby listings using geospatial query
 * @param {String} listingId
 * @param {Number} maxDistance - Maximum distance in kilometers (default 50)
 * @param {Number} limit
 * @returns {Array}
 */
async function getNearbyListings(listingId, maxDistance = 50, limit = 6) {
  const sourceListing = await Listing.findById(listingId)

  if (!sourceListing || !sourceListing.geometry || !sourceListing.geometry.coordinates) {
    return []
  }

  const listings = await Listing.find({
    _id: { $ne: listingId },
    status: "active",
    geometry: {
      $near: {
        $geometry: sourceListing.geometry,
        $maxDistance: maxDistance * 1000, // Convert km to meters
      },
    },
  })
    .populate("owner", "username")
    .limit(limit)
    .lean()

  return listings
}

/**
 * Get trending listings (featured, highly rated, recently booked)
 * @param {Number} limit
 * @returns {Array}
 */
async function getTrendingListings(limit = 8) {
  const listings = await Listing.find({
    status: "active",
    isFeatured: true,
  })
    .populate("owner", "username")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return listings
}

module.exports = {
  calculateSimilarity,
  getRecommendations,
  getPopularByCategory,
  getNearbyListings,
  getTrendingListings,
}
