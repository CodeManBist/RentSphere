// Seasonal Pricing Configuration Model
const mongoose = require("mongoose")
const Schema = mongoose.Schema

const seasonalPricingSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // Multiplier to apply to base price (1.0 = no change)
    multiplier: {
      type: Number,
      required: true,
      default: 1.0,
    },
    // Date ranges when this season applies (month-day format for yearly recurrence)
    dateRanges: [
      {
        startMonth: { type: Number, min: 1, max: 12 },
        startDay: { type: Number, min: 1, max: 31 },
        endMonth: { type: Number, min: 1, max: 12 },
        endDay: { type: Number, min: 1, max: 31 },
      },
    ],
    // Or specific day rules
    dayOfWeek: {
      type: [Number], // 0=Sunday, 6=Saturday
      default: [],
    },
    priority: {
      type: Number,
      default: 0, // Higher priority rules override lower ones
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: String,
  },
  { timestamps: true },
)

module.exports = mongoose.model("SeasonalPricing", seasonalPricingSchema)
