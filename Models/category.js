// Category Model - Defines all rental categories with their specific fields
const mongoose = require("mongoose")
const Schema = mongoose.Schema

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    parentCategory: {
      type: String,
      enum: ["stays", "vehicles", "equipment", "adventure", "professional"],
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    description: String,
    // Category-specific required fields
    requiredFields: [
      {
        fieldName: String,
        fieldType: { type: String, enum: ["string", "number", "boolean", "array"] },
        label: String,
        required: { type: Boolean, default: false },
      },
    ],
    // Pricing configuration for this category
    pricingUnit: {
      type: String,
      enum: ["night", "hour", "day", "week"],
      default: "night",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Category", categorySchema)
