const mongoose = require("mongoose")
const Schema = mongoose.Schema
const passportLocalMongoose = require("passport-local-mongoose")

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["guest", "host", "admin"],
      default: "guest",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    profile: {
      firstName: String,
      lastName: String,
      phone: String,
      avatar: {
        url: String,
        filename: String,
      },
      bio: String,
      verifiedEmail: { type: Boolean, default: false },
      verifiedPhone: { type: Boolean, default: false },
    },
    // Host-specific fields
    hostInfo: {
      responseRate: { type: Number, default: 100 },
      responseTime: String,
      superhost: { type: Boolean, default: false },
      totalEarnings: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
    },
    // Guest-specific fields
    guestInfo: {
      totalTrips: { type: Number, default: 0 },
      reviewsWritten: { type: Number, default: 0 },
    },
    savedListings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Listing",
      },
    ],
    searchHistory: [
      {
        query: String,
        category: String,
        priceRange: {
          min: Number,
          max: Number,
        },
        location: String,
        searchedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      favoriteCategories: [String],
      averagePriceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 10000 },
      },
      favoriteLocations: [String],
    },
  },
  { timestamps: true },
)

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", userSchema)
