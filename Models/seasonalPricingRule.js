const mongoose = require("mongoose")
const Schema = mongoose.Schema

const seasonalPricingRuleSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["season", "weekend", "holiday", "custom"],
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 0.5,
      max: 3.0,
    },
    // For date-range based rules
    startDate: Date,
    endDate: Date,
    // For recurring rules (e.g., every weekend, every summer)
    recurring: {
      type: Boolean,
      default: false,
    },
    // For recurring - specify months (1-12)
    months: [Number],
    // For recurring - specify days of week (0=Sunday, 6=Saturday)
    daysOfWeek: [Number],
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1, // Higher priority rules override lower ones
    },
  },
  { timestamps: true },
)

seasonalPricingRuleSchema.index({ listing: 1, isActive: 1 })
seasonalPricingRuleSchema.index({ startDate: 1, endDate: 1 })

module.exports = mongoose.model("SeasonalPricingRule", seasonalPricingRuleSchema)
