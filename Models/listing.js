const mongoose = require("mongoose")
const Review = require("./review")
const Schema = mongoose.Schema

const listingSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    image: {
      url: String,
      filename: String,
    },
    // Additional images for gallery
    gallery: [
      {
        url: String,
        filename: String,
      },
    ],
    // Base price before seasonal adjustments
    price: Number,
    location: String,
    country: String,
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    geometry: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    parentCategory: {
      type: String,
      enum: ["stays", "vehicles", "equipment", "adventure", "professional"],
      required: true,
      default: "stays",
    },
    category: {
      type: String,
      required: true,
    },

    // Pricing configuration
    pricingUnit: {
      type: String,
      enum: ["night", "hour", "day", "week"],
      default: "night",
    },

    categoryFields: {
      // Stays: bedrooms, bathrooms, beds, amenities
      // Vehicles: make, model, year, fuelType, transmission, seats
      // Equipment: brand, condition, accessories
      // Adventure: difficulty, duration, groupSize
      // Professional: capacity, amenities, equipment
      type: Schema.Types.Mixed,
      default: {},
    },

    // Booking settings
    bookingSettings: {
      minStay: { type: Number, default: 1 },
      maxStay: { type: Number, default: 30 },
      checkInTime: { type: String, default: "15:00" },
      checkOutTime: { type: String, default: "11:00" },
      advanceNotice: { type: Number, default: 24 }, // hours
      instantBook: { type: Boolean, default: false }, // If true, skip host approval
    },
    maxGuests: { type: Number, default: 4 },

    // Listing status
    status: {
      type: String,
      enum: ["active", "inactive", "deleted", "pending_approval", "rejected"],
      default: "active",
    },

    // Featured/promoted listing
    isFeatured: { type: Boolean, default: false },

    // Policies
    policies: {
      petsAllowed: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
      cancellationPolicy: {
        type: String,
        enum: ["flexible", "moderate", "strict"],
        default: "moderate",
      },
    },
  },
  { timestamps: true },
)

listingSchema.index({ geometry: "2dsphere" })
listingSchema.index({ parentCategory: 1, category: 1 })
listingSchema.index({ price: 1 })
listingSchema.index({ location: "text", title: "text" })

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } })
  }
})

// Virtual for formatted price with unit
listingSchema.virtual("formattedPrice").get(function () {
  return `₹${this.price.toLocaleString("en-IN")} / ${this.pricingUnit}`
})

const Listing = mongoose.model("Listing", listingSchema)
module.exports = Listing
