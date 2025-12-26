const mongoose = require("mongoose")
const Schema = mongoose.Schema

const bookingSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    guest: { type: Schema.Types.ObjectId, ref: "User", required: true },
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },

    checkIn: { type: Date, required: true, index: true },
    checkOut: { type: Date, required: true, index: true },
    bookedAt: { type: Date, default: Date.now },

    guestCount: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 },
    },

    pricing: {
      nightlyRate: Number, // Original base rate
      nights: Number, // Or hours/days depending on unit
      pricingUnit: { type: String, default: "night" },
      basePrice: Number, // nightlyRate * nights
      seasonalMultiplier: { type: Number, default: 1.0 },
      seasonalAdjustment: Number, // Amount added/subtracted due to season
      cleaningFee: { type: Number, default: 0 },
      serviceFee: Number,
      total: Number,
      seasonBreakdown: [
        {
          // Detailed breakdown per day/night
          date: Date,
          rate: Number,
          seasonName: String,
          multiplier: Number,
        },
      ],
    },

    // pending_payment → paid → pending_approval → confirmed/rejected → completed/cancelled
    status: {
      type: String,
      enum: [
        "pending_payment", // User selected dates, not yet paid
        "paid", // User paid, waiting for host approval
        "pending_approval", // Alias for paid status (host needs to act)
        "confirmed", // Host approved
        "rejected", // Host rejected
        "cancelled", // Cancelled by guest or host
        "completed", // Stay completed
      ],
      default: "pending_payment",
    },

    cancellation: {
      cancelledBy: { type: String, enum: ["guest", "host", null], default: null },
      cancelledAt: Date,
      reason: String,
      refundStatus: {
        type: String,
        enum: ["none", "pending", "processing", "completed", "failed"],
        default: "none",
      },
      refundAmount: Number,
      refundMessage: String,
    },

    // Payment block for Cashfree
    payment: {
      provider: { type: String, default: "cashfree" },
      cfOrderId: String,
      cfPaymentSessionId: String,
      status: {
        type: String,
        enum: ["pending", "paid", "refunded", "failed"],
        default: "pending",
      },
      paidAt: Date,
      transactionId: String,
    },

    guestMessage: String,
    hostResponse: String,
  },
  { timestamps: true },
)

bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 })
bookingSchema.index({ guest: 1, bookedAt: -1 })
bookingSchema.index({ host: 1, status: 1 })

bookingSchema.statics.hasConflict = async function (listingId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    listing: listingId,
    status: { $in: ["paid", "pending_approval", "confirmed"] },
    $and: [{ checkIn: { $lt: checkOut } }, { checkOut: { $gt: checkIn } }],
  }

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId }
  }

  const conflict = await this.findOne(query)
  return !!conflict
}

module.exports = mongoose.model("Booking", bookingSchema)
