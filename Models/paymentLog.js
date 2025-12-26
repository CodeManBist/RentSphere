const mongoose = require("mongoose")
const Schema = mongoose.Schema

const paymentLogSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    provider: {
      type: String,
      enum: ["cashfree", "razorpay", "stripe"],
      default: "cashfree",
    },
    providerOrderId: String,
    providerPaymentId: String,
    providerSignature: String,
    status: {
      type: String,
      enum: ["initiated", "pending", "success", "failed", "refunded", "refund_pending"],
      default: "initiated",
    },
    type: {
      type: String,
      enum: ["payment", "refund"],
      default: "payment",
    },
    metadata: Schema.Types.Mixed,
    errorMessage: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
)

paymentLogSchema.index({ booking: 1 })
paymentLogSchema.index({ user: 1, createdAt: -1 })
paymentLogSchema.index({ status: 1 })

module.exports = mongoose.model("PaymentLog", paymentLogSchema)
