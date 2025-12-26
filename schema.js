const Joi = require("joi")

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    price: Joi.number().required().min(0),
    image: Joi.object({
      filename: Joi.string(),
      url: Joi.string().allow("", null),
    }).optional(),
    // New fields for multi-category support
    parentCategory: Joi.string().valid("stays", "vehicles", "equipment", "adventure", "professional").default("stays"),
    category: Joi.string().allow("").optional(),
    pricingUnit: Joi.string().valid("night", "hour", "day", "week").default("night"),
    maxGuests: Joi.number().min(1).max(50).default(4),
    // Booking settings
    minStay: Joi.number().min(1).optional(),
    maxStay: Joi.number().min(1).optional(),
    checkInTime: Joi.string().optional(),
    checkOutTime: Joi.string().optional(),
    instantBook: Joi.string().valid("true", "false").optional(),
    // Policies
    petsAllowed: Joi.string().valid("true", "false").optional(),
    smokingAllowed: Joi.string().valid("true", "false").optional(),
    cancellationPolicy: Joi.string().valid("flexible", "moderate", "strict").default("moderate"),
    // Category-specific fields
    categoryFields: Joi.object().optional(),
  }).required(),
})

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
})
