// controllers/payment.js
const Booking = require("../Models/booking")
const Listing = require("../Models/listing")
const mongoose = require("mongoose")

const CASHFREE_BASE =
  process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg"

async function cfRequest(path, method, body) {
  try {
    const res = await fetch(CASHFREE_BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2022-09-01",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Cashfree API error:", data)
      throw new Error(data.message || `Cashfree API error: ${res.status}`)
    }

    return data
  } catch (error) {
    console.error("Cashfree request failed:", error)
    throw error
  }
}

module.exports.initiatePayment = async (req, res) => {
  try {
    const bookingId = req.params.bookingId.trim()

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      req.flash("error", "Invalid booking ID")
      return res.redirect("/bookings/guest/dashboard")
    }

    const booking = await Booking.findById(bookingId).populate("listing").populate("guest")

    if (!booking) {
      req.flash("error", "Booking not found!")
      return res.redirect("/bookings/guest/dashboard")
    }

    if (!booking.guest._id.equals(req.user._id)) {
      req.flash("error", "Not authorized")
      return res.redirect("/bookings/guest/dashboard")
    }

    // Check if already paid
    if (booking.payment && booking.payment.status === "paid") {
      req.flash("success", "Payment already completed")
      return res.redirect(`/bookings/booking/${booking._id}`)
    }

    // If there's an existing payment session, reuse it
    if (booking.payment && booking.payment.cfPaymentSessionId) {
      return res.render("payments/cashfree-checkout", {
        paymentSessionId: booking.payment.cfPaymentSessionId,
        booking,
        cashfreeMode: process.env.CASHFREE_ENV || "sandbox",
      })
    }

    const orderId = `order_${booking._id}_${Date.now()}`

    const orderReq = {
      order_id: orderId,
      order_amount: booking.pricing.total,
      order_currency: "INR",
      customer_details: {
        customer_id: String(booking.guest._id),
        customer_name: booking.guest.username || "Guest",
        customer_email: booking.guest.email || "guest@rentsphere.com",
        customer_phone: booking.guest.profile?.phone || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.DOMAIN}/payments/cashfree-return?order_id={order_id}&booking_id=${booking._id}`,
      },
    }

    const cfOrder = await cfRequest("/orders", "POST", orderReq)

    booking.payment.cfOrderId = cfOrder.order_id
    booking.payment.cfPaymentSessionId = cfOrder.payment_session_id
    booking.payment.status = "pending"
    await booking.save()

    res.render("payments/cashfree-checkout", {
      paymentSessionId: cfOrder.payment_session_id,
      booking,
      cashfreeMode: process.env.CASHFREE_ENV || "sandbox",
    })
  } catch (err) {
    console.error("Payment error:", err)
    req.flash("error", err.message || "Payment initialization failed. Please try again.")
    return res.redirect("/bookings/guest/dashboard")
  }
}

module.exports.cashfreeReturn = async (req, res) => {
  try {
    const { order_id, booking_id } = req.query

    if (!order_id) {
      req.flash("error", "Invalid payment response")
      return res.redirect("/bookings/guest/dashboard")
    }

    // Try to find booking by ID from query or extract from order_id
    let bookingId = booking_id
    if (!bookingId) {
      // Extract booking ID from order_id (format: order_BOOKINGID_TIMESTAMP)
      const parts = order_id.split("_")
      if (parts.length >= 2) {
        bookingId = parts[1]
      }
    }

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      req.flash("error", "Invalid booking reference")
      return res.redirect("/bookings/guest/dashboard")
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      req.flash("error", "Booking not found after payment")
      return res.redirect("/bookings/guest/dashboard")
    }

    const cfOrder = await cfRequest(`/orders/${order_id}`, "GET")

    if (cfOrder.order_status === "PAID") {
      booking.payment.status = "paid"
      booking.payment.paidAt = new Date()
      booking.payment.transactionId = cfOrder.cf_order_id || order_id

      booking.status = "paid"
      await booking.save()

      req.flash("success", "Payment successful! Your booking request has been sent to the host for approval.")
      return res.redirect(`/bookings/booking/${booking._id}`)
    } else {
      req.flash(
        "error",
        `Payment ${cfOrder.order_status ? cfOrder.order_status.toLowerCase() : "failed"}. Please try again.`,
      )
      return res.redirect(`/bookings/booking/${booking._id}`)
    }
  } catch (err) {
    console.error("Payment return error:", err)
    req.flash("error", "Error verifying payment. Please check your booking status.")
    return res.redirect("/bookings/guest/dashboard")
  }
}

module.exports.createBookingAndPay = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { listingId } = req.params
    const { checkIn, checkOut, guests, message } = req.body
    const guestId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      throw new Error("Invalid listing ID")
    }

    const listing = await Listing.findById(listingId).populate("owner")
    if (!listing) {
      throw new Error("Listing not found")
    }

    if (listing.status === "deleted" || listing.status === "inactive") {
      throw new Error("This listing is no longer available")
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error("Invalid dates provided")
    }

    if (checkInDate >= checkOutDate) {
      throw new Error("Check-out must be after check-in")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (checkInDate < today) {
      throw new Error("Cannot book dates in the past")
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))

    const guestsNum = Number.parseInt(guests || 1, 10)
    if (guestsNum > (listing.maxGuests || 4)) {
      throw new Error(`Maximum ${listing.maxGuests || 4} guests allowed for this listing`)
    }

    if (listing.bookingSettings && nights < listing.bookingSettings.minStay) {
      throw new Error(`Minimum stay is ${listing.bookingSettings.minStay} ${listing.pricingUnit || "night"}s`)
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      listing: listingId,
      status: { $in: ["paid", "pending_approval", "confirmed"] },
      $or: [{ checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }],
    }).session(session)

    if (conflictingBookings.length > 0) {
      throw new Error("Selected dates are no longer available")
    }

    // Use seasonal pricing
    const { calculateSeasonalPrice } = require("../utils/seasonalPricing")
    const seasonalPricing = calculateSeasonalPrice(listing.price, checkInDate, checkOutDate)
    const serviceFee = Math.round(seasonalPricing.subtotal * 0.12)
    const total = Math.round(seasonalPricing.subtotal + serviceFee)

    const [booking] = await Booking.create(
      [
        {
          listing: listingId,
          guest: guestId,
          host: listing.owner._id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestCount: {
            adults: guestsNum,
          },
          pricing: {
            nightlyRate: listing.price,
            nights: seasonalPricing.nights,
            pricingUnit: listing.pricingUnit || "night",
            basePrice: seasonalPricing.basePrice,
            seasonalMultiplier: seasonalPricing.averageMultiplier,
            seasonalAdjustment: seasonalPricing.seasonalAdjustment,
            cleaningFee: 0,
            serviceFee,
            total,
            seasonBreakdown: seasonalPricing.breakdown,
          },
          guestMessage: message,
          status: "pending_payment",
          payment: {
            provider: "cashfree",
            status: "pending",
          },
        },
      ],
      { session },
    )

    await session.commitTransaction()

    // Create Cashfree order
    const orderId = `order_${booking._id}_${Date.now()}`

    const orderReq = {
      order_id: orderId,
      order_amount: booking.pricing.total,
      order_currency: "INR",
      customer_details: {
        customer_id: String(booking.guest),
        customer_name: req.user.username || "Guest",
        customer_email: req.user.email || "guest@rentsphere.com",
        customer_phone: req.user.profile?.phone || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.DOMAIN}/payments/cashfree-return?order_id={order_id}&booking_id=${booking._id}`,
      },
    }

    const cfOrder = await cfRequest("/orders", "POST", orderReq)

    booking.payment.cfOrderId = cfOrder.order_id
    booking.payment.cfPaymentSessionId = cfOrder.payment_session_id
    await booking.save()

    res.render("payments/cashfree-checkout", {
      paymentSessionId: cfOrder.payment_session_id,
      booking,
      cashfreeMode: process.env.CASHFREE_ENV || "sandbox",
    })
  } catch (err) {
    await session.abortTransaction()
    console.error("Booking/Payment creation error:", err)
    req.flash("error", err.message || "Error processing booking. Please try again.")
    res.redirect(`/listings/${req.params.listingId}`)
  } finally {
    session.endSession()
  }
}

// Keep legacy function name for compatibility
module.exports.createCashfreeOrder = module.exports.initiatePayment
