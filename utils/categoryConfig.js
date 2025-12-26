// Category Configuration - All rental categories with their specific fields and icons

const CATEGORIES = {
  // ===== STAY RENTALS =====
  stays: {
    name: "Stay Rentals",
    icon: "fa-solid fa-house",
    pricingUnit: "night",
    subcategories: {
      houses: {
        name: "Houses",
        icon: "fa-solid fa-house",
        fields: ["bedrooms", "bathrooms", "beds", "amenities"],
      },
      "private-rooms": {
        name: "Private Rooms",
        icon: "fa-solid fa-bed",
        fields: ["bedrooms", "bathrooms", "amenities", "sharedSpaces"],
      },
      villas: {
        name: "Villas",
        icon: "fa-solid fa-hotel",
        fields: ["bedrooms", "bathrooms", "beds", "pool", "amenities"],
      },
      "farm-stays": {
        name: "Farm Stays",
        icon: "fa-solid fa-cow",
        fields: ["bedrooms", "bathrooms", "farmActivities", "amenities"],
      },
      treehouses: {
        name: "Treehouses",
        icon: "fa-solid fa-tree",
        fields: ["bedrooms", "height", "accessibility", "amenities"],
      },
      apartments: {
        name: "Apartments",
        icon: "fa-solid fa-building",
        fields: ["bedrooms", "bathrooms", "floor", "amenities"],
      },
      camping: {
        name: "Camping",
        icon: "fa-solid fa-campground",
        fields: ["tentProvided", "campfireAllowed", "facilities"],
      },
    },
  },

  // ===== VEHICLE RENTALS =====
  vehicles: {
    name: "Vehicle Rentals",
    icon: "fa-solid fa-car",
    pricingUnit: "day",
    subcategories: {
      cars: {
        name: "Cars",
        icon: "fa-solid fa-car",
        fields: ["make", "model", "year", "fuelType", "transmission", "seats", "mileageLimit"],
      },
      bikes: {
        name: "Bikes",
        icon: "fa-solid fa-motorcycle",
        fields: ["make", "model", "engineCC", "fuelType", "helmetIncluded"],
      },
      scooters: {
        name: "Scooters",
        icon: "fa-solid fa-motorcycle",
        fields: ["make", "model", "electric", "range", "helmetIncluded"],
      },
      evs: {
        name: "Electric Vehicles",
        icon: "fa-solid fa-charging-station",
        fields: ["make", "model", "range", "chargingType", "seats"],
      },
      bicycles: {
        name: "Bicycles",
        icon: "fa-solid fa-bicycle",
        fields: ["type", "gears", "helmetIncluded", "lockIncluded"],
      },
    },
  },

  // ===== EQUIPMENT RENTALS =====
  equipment: {
    name: "Equipment Rentals",
    icon: "fa-solid fa-camera",
    pricingUnit: "day",
    subcategories: {
      cameras: {
        name: "Cameras",
        icon: "fa-solid fa-camera",
        fields: ["brand", "model", "type", "megapixels", "accessories"],
      },
      lenses: {
        name: "Lenses",
        icon: "fa-solid fa-circle",
        fields: ["brand", "focalLength", "aperture", "mount", "condition"],
      },
      drones: {
        name: "Drones",
        icon: "fa-solid fa-helicopter",
        fields: ["brand", "model", "flightTime", "cameraQuality", "accessories"],
      },
      lighting: {
        name: "Lighting Equipment",
        icon: "fa-solid fa-lightbulb",
        fields: ["type", "watts", "accessories", "quantity"],
      },
      audio: {
        name: "Audio Equipment",
        icon: "fa-solid fa-microphone",
        fields: ["type", "brand", "model", "accessories"],
      },
    },
  },

  // ===== ADVENTURE & TRAVEL GEAR =====
  adventure: {
    name: "Adventure & Travel Gear",
    icon: "fa-solid fa-compass",
    pricingUnit: "day",
    subcategories: {
      tents: {
        name: "Tents",
        icon: "fa-solid fa-campground",
        fields: ["capacity", "type", "seasonRating", "weight", "accessories"],
      },
      trekking: {
        name: "Trekking Equipment",
        icon: "fa-solid fa-hiking",
        fields: ["type", "size", "brand", "condition"],
      },
      kayaks: {
        name: "Kayaks",
        icon: "fa-solid fa-water",
        fields: ["type", "capacity", "length", "paddleIncluded", "vestIncluded"],
      },
      binoculars: {
        name: "Binoculars",
        icon: "fa-solid fa-binoculars",
        fields: ["brand", "magnification", "type", "waterproof"],
      },
      "camping-gear": {
        name: "Camping Gear",
        icon: "fa-solid fa-fire",
        fields: ["items", "forPersons", "condition"],
      },
    },
  },

  // ===== PROFESSIONAL SPACES =====
  professional: {
    name: "Professional Spaces",
    icon: "fa-solid fa-briefcase",
    pricingUnit: "hour",
    subcategories: {
      coworking: {
        name: "Co-working Spaces",
        icon: "fa-solid fa-laptop",
        fields: ["desks", "wifi", "amenities", "meetingRooms"],
      },
      "meeting-rooms": {
        name: "Meeting Rooms",
        icon: "fa-solid fa-users",
        fields: ["capacity", "projector", "whiteboard", "videoConf", "amenities"],
      },
      "event-halls": {
        name: "Event Halls",
        icon: "fa-solid fa-champagne-glasses",
        fields: ["capacity", "catering", "parking", "audioVisual", "eventTypes"],
      },
      studios: {
        name: "Studios",
        icon: "fa-solid fa-video",
        fields: ["type", "size", "equipment", "soundproofed", "lighting"],
      },
    },
  },
}

/**
 * Get all parent categories
 */
function getParentCategories() {
  return Object.entries(CATEGORIES).map(([key, value]) => ({
    key,
    name: value.name,
    icon: value.icon,
    pricingUnit: value.pricingUnit,
  }))
}

/**
 * Get subcategories for a parent category
 */
function getSubcategories(parentCategory) {
  if (!CATEGORIES[parentCategory]) {
    return []
  }

  return Object.entries(CATEGORIES[parentCategory].subcategories).map(([key, value]) => ({
    key,
    name: value.name,
    icon: value.icon,
    fields: value.fields,
  }))
}

/**
 * Get all categories flattened for filter display
 */
function getAllCategoriesFlat() {
  const flat = []

  for (const [parentKey, parent] of Object.entries(CATEGORIES)) {
    for (const [subKey, sub] of Object.entries(parent.subcategories)) {
      flat.push({
        parentCategory: parentKey,
        parentName: parent.name,
        category: subKey,
        name: sub.name,
        icon: sub.icon,
        pricingUnit: parent.pricingUnit,
      })
    }
  }

  return flat
}

/**
 * Get category details
 */
function getCategoryDetails(parentCategory, category) {
  if (!CATEGORIES[parentCategory] || !CATEGORIES[parentCategory].subcategories[category]) {
    return null
  }

  return {
    parent: {
      key: parentCategory,
      name: CATEGORIES[parentCategory].name,
      icon: CATEGORIES[parentCategory].icon,
      pricingUnit: CATEGORIES[parentCategory].pricingUnit,
    },
    category: {
      key: category,
      ...CATEGORIES[parentCategory].subcategories[category],
    },
  }
}

/**
 * Validate category exists
 */
function isValidCategory(parentCategory, category) {
  return CATEGORIES[parentCategory] && CATEGORIES[parentCategory].subcategories[category]
}

module.exports = {
  CATEGORIES,
  getParentCategories,
  getSubcategories,
  getAllCategoriesFlat,
  getCategoryDetails,
  isValidCategory,
}
