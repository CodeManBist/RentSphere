// controllers/booking.js
const Booking = require("../Models/booking")
const Listing = require("../Models/listing")
const mongoose = require("mongoose")
const { checkAvailability, getCalendarData } = require("../utils/availabilityChecker")
const { calculateSeasonalPrice, getCurrentSeason } = require("../utils/seasonalPricing")
const { getRefundMessage, getCancellationPolicyMessage } = require("../utils/refundMessages")

module.exports = {
  checkAvailability: async (req, res) => {
    try {
      const { listingId } = req.params
      const { checkIn, checkOut, guests } = req.query

      const listing = await Listing.findById(listingId)
      if (!listing) {
        return res.json({ available: false, error: "Listing not found" })
      }

      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)

      if (isNaN(checkInDate) || isNaN(checkOutDate)) {
        return res.json({ available: false, error: "Invalid dates" })
      }

      if (checkInDate >= checkOutDate) {
        return res.json({ available: false, error: "Invalid dates" })
      }

      const guestsNum = Number.parseInt(guests || 1, 10)
      if (guestsNum > listing.maxGuests) {
        return res.json({ available: false, error: "Too many guests" })
      }

      // Check availability using utility
      const availability = await checkAvailability(listingId, checkIn, checkOut)

      if (!availability.available) {
        return res.json({
          available: false,
          error: availability.error || "Selected dates are not available",
          conflicts: availability.conflicts,
        })
      }

      const seasonalPricing = calculateSeasonalPrice(listing.price, checkInDate, checkOutDate)
      const serviceFee = Math.round(seasonalPricing.subtotal * 0.12)
      const total = Math.round(seasonalPricing.subtotal + serviceFee)

      return res.json({
        available: true,
        pricing: {
          nights: seasonalPricing.nights,
          pricingUnit: listing.pricingUnit,
          baseNightlyRate: listing.price,
          basePrice: seasonalPricing.basePrice,
          seasonalAdjustment: seasonalPricing.seasonalAdjustment,
          averageMultiplier: seasonalPricing.averageMultiplier,
          subtotal: seasonalPricing.subtotal,
          serviceFee,
          total,
          breakdown: seasonalPricing.breakdown,
        },
        listing: {
          title: listing.title,
          maxGuests: listing.maxGuests,
          pricingUnit: listing.pricingUnit,
        },
        currentSeason: getCurrentSeason(),
      })
    } catch (err) {
      console.error("Availability check error:", err)
      res.status(500).json({ available: false, error: "Server error" })
    }
  },

  // Get calendar data for a listing
  getCalendar: async (req, res) => {
    try {
      const { listingId } = req.params
      const calendar = await getCalendarData(listingId, 3)
      res.json({ calendar })
    } catch (err) {
      console.error("Calendar fetch error:", err)
      res.status(500).json({ error: "Server error" })
    }
  },

  // Show booking form
  showBookingForm: async (req, res) => {
    try {
      const { listingId } = req.params
      const { checkIn, checkOut, guests } = req.query

      const listing = await Listing.findById(listingId).populate("owner", "username")
      if (!listing) {
        req.flash("error", "Listing not found")
        return res.redirect("/listings")
      }

      // Calculate pricing for display
      let pricing = null
      if (checkIn && checkOut) {
        const seasonalPricing = calculateSeasonalPrice(listing.price, new Date(checkIn), new Date(checkOut))
        const serviceFee = Math.round(seasonalPricing.subtotal * 0.12)
        pricing = {
          ...seasonalPricing,
          serviceFee,
          total: seasonalPricing.subtotal + serviceFee,
        }
      }

      const cancellationMessage = getCancellationPolicyMessage(listing.policies?.cancellationPolicy)

      res.render("bookings/new", {
        listing,
        checkIn,
        checkOut,
        guests: guests || 1,
        pricing,
        cancellationMessage,
      })
    } catch (err) {
      console.error("showBookingForm error:", err)
      req.flash("error", "Error loading booking form")
      res.redirect(`/listings/${req.params.listingId}`)
    }
  },

  createBooking: async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { listingId } = req.params
      const { checkIn, checkOut, guests, message } = req.body
      const guestId = req.user._id

      const listing = await Listing.findById(listingId).populate("owner")
      if (!listing) {
        throw new Error("Listing not found")
      }

      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)

      if (isNaN(checkInDate) || isNaN(checkOutDate)) {
        throw new Error("Invalid dates")
      }

      if (checkInDate >= checkOutDate) {
        throw new Error("Invalid dates")
      }

      const guestsNum = Number.parseInt(guests || 1, 10)
      if (guestsNum > listing.maxGuests) {
        throw new Error("Too many guests")
      }

      const seasonalPricing = calculateSeasonalPrice(listing.price, checkInDate, checkOutDate)

      if (listing.bookingSettings && seasonalPricing.nights < listing.bookingSettings.minStay) {
        throw new Error(`Minimum stay is ${listing.bookingSettings.minStay} ${listing.pricingUnit}s`)
      }

      // Check availability
      const availability = await checkAvailability(listingId, checkIn, checkOut)
      if (!availability.available) {
        throw new Error("Selected dates are no longer available")
      }

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
              pricingUnit: listing.pricingUnit,
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

      // Redirect to payment
      res.redirect(`/payments/pay/${booking._id}`)
    } catch (err) {
      await session.abortTransaction()
      console.error("Booking creation error:", err)
      req.flash("error", err.message)
      res.redirect(`/listings/${req.params.listingId}`)
    } finally {
      session.endSession()
    }
  },

  // Show booking details
  showBooking: async (req, res) => {
    try {
      const { bookingId } = req.params

      const booking = await Booking.findById(bookingId).populate("listing").populate("guest").populate("host")

      if (!booking) {
        req.flash("error", "Booking not found")
        return res.redirect("/listings")
      }

      const isGuest = req.user && booking.guest && booking.guest._id.equals(req.user._id)
      const isHost = req.user && booking.host && booking.host._id.equals(req.user._id)

      if (!isGuest && !isHost) {
        req.flash("error", "Not authorized")
        return res.redirect("/listings")
      }

      const refundMessage = getRefundMessage(booking)
      const cancellationPolicy = getCancellationPolicyMessage(
        booking.listing?.policies?.cancellationPolicy || "moderate",
      )

      res.render("bookings/show-booking", {
        booking,
        isGuest,
        isHost,
        refundMessage,
        cancellationPolicy,
      })
    } catch (err) {
      console.error("showBooking error:", err)
      req.flash("error", "Error loading booking")
      res.redirect("/listings")
    }
  },

  acceptBooking: async (req, res) => {
    try {
      const { bookingId } = req.params

      const booking = await Booking.findById(bookingId)
      if (!booking) {
        req.flash("error", "Booking not found")
        return res.redirect("/listings")
      }

      if (!booking.host.equals(req.user._id)) {
        req.flash("error", "Not authorized")
        return res.redirect("/listings")
      }

      // Only accept if payment is completed
      if (booking.payment.status !== "paid") {
        req.flash("error", "Cannot accept booking - payment not received")
        return res.redirect(`/bookings/booking/${booking._id}`)
      }

      booking.status = "confirmed"
      await booking.save()

      req.flash("success", "Booking confirmed!")
      res.redirect(`/bookings/booking/${booking._id}`)
    } catch (err) {
      console.error("acceptBooking error:", err)
      req.flash("error", "Error accepting booking")
      res.redirect("/listings")
    }
  },

  rejectBooking: async (req, res) => {
    try {
      const { bookingId } = req.params
      const { reason } = req.body

      const booking = await Booking.findById(bookingId)
      if (!booking) {
        req.flash("error", "Booking not found")
        return res.redirect("/listings")
      }

      if (!booking.host.equals(req.user._id)) {
        req.flash("error", "Not authorized")
        return res.redirect("/listings")
      }

      booking.status = "rejected"
      booking.hostResponse = reason
      booking.cancellation = {
        cancelledBy: "host",
        cancelledAt: new Date(),
        reason: reason || "Host declined the booking",
        refundStatus: booking.payment.status === "paid" ? "pending" : "none",
        refundAmount: booking.payment.status === "paid" ? booking.pricing.total : 0,
        refundMessage: "Your payment will be refunded within 24 working hours.",
      }

      await booking.save()

      req.flash("success", "Booking declined. Guest will be notified.")
      res.redirect(`/bookings/booking/${booking._id}`)
    } catch (err) {
      console.error("rejectBooking error:", err)
      req.flash("error", "Error declining booking")
      res.redirect("/listings")
    }
  },

  cancelBooking: async (req, res) => {
    try {
      const { bookingId } = req.params
      const { reason } = req.body

      const booking = await Booking.findById(bookingId)
      if (!booking) {
        req.flash("error", "Booking not found")
        return res.redirect("/listings")
      }

      const isGuest = booking.guest.equals(req.user._id)
      const isHost = booking.host.equals(req.user._id)

      if (!isGuest && !isHost) {
        req.flash("error", "Not authorized")
        return res.redirect("/listings")
      }

      const cancelledBy = isHost ? "host" : "guest"
      const wasPaid = booking.payment.status === "paid"

      // Determine refund message based on who cancelled
      let refundMessage = ""
      if (wasPaid) {
        refundMessage = isHost
          ? "Host cancelled the booking. Refund will be issued within 24 working hours."
          : "Your payment will be refunded within 24 working hours."
      }

      booking.status = "cancelled"
      booking.cancellation = {
        cancelledBy,
        cancelledAt: new Date(),
        reason: reason || `Cancelled by ${cancelledBy}`,
        refundStatus: wasPaid ? "pending" : "none",
        refundAmount: wasPaid ? booking.pricing.total : 0,
        refundMessage,
      }

      await booking.save()

      req.flash("success", `Booking cancelled. ${refundMessage}`)
      res.redirect(`/bookings/booking/${booking._id}`)
    } catch (err) {
      console.error("cancelBooking error:", err)
      req.flash("error", "Error cancelling booking")
      res.redirect("/listings")
    }
  },

  hostDashboard: async (req, res) => {
    try {
      const hostId = req.user._id

      const hostListings = await Listing.find({ owner: hostId, status: "active" })

      const bookings = await Booking.find({ host: hostId }).populate("listing").populate("guest").sort({ checkIn: 1 })

      // Categorize bookings
      const pendingPayment = bookings.filter((b) => b.status === "pending_payment")
      const pendingApproval = bookings.filter((b) => b.status === "paid" || b.status === "pending_approval")
      const confirmedBookings = bookings.filter((b) => b.status === "confirmed")
      const completedBookings = bookings.filter((b) => b.status === "completed")
      const cancelledBookings = bookings.filter((b) => b.status === "cancelled" || b.status === "rejected")

      const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.pricing.total || 0), 0)
      const pendingEarnings = confirmedBookings.reduce((sum, b) => sum + (b.pricing.total || 0), 0)
      const upcomingBookings = confirmedBookings.filter((b) => new Date(b.checkIn) > new Date())

      // Occupancy rate calculation (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed")
      const totalNightsBooked = recentBookings.reduce((sum, b) => sum + (b.pricing.nights || 0), 0)
      const occupancyRate = Math.min(100, Math.round((totalNightsBooked / (30 * hostListings.length || 1)) * 100))

      res.render("bookings/host-dashboard", {
        bookings,
        pendingPayment,
        pendingApproval,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        hostListings,
        analytics: {
          totalEarnings,
          pendingEarnings,
          upcomingCount: upcomingBookings.length,
          occupancyRate,
          totalBookings: bookings.length,
        },
      })
    } catch (err) {
      console.error("Host dashboard error:", err)
      req.flash("error", "Error loading dashboard")
      res.redirect("/listings")
    }
  },

  guestDashboard: async (req, res) => {
    try {
      const guestId = req.user._id

      // Include bookings where the user is either the guest (usual case)
      // or the host (covers self-bookings / admin-as-host scenarios).
      const bookings = await Booking.find({
        $or: [{ guest: guestId }, { host: guestId }],
      })
        .populate("listing")
        .populate("host")
        .sort({ checkIn: -1 })

      // Categorize
      const now = new Date()
      const upcomingTrips = bookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "paid" || b.status === "pending_approval") &&
          new Date(b.checkOut) >= now,
      )
      const pastTrips = bookings.filter(
        (b) =>
          b.status === "completed" ||
          (b.status === "confirmed" && new Date(b.checkOut) < now) ||
          (b.status === "paid" && new Date(b.checkOut) < now),
      )
      const pendingBookings = bookings.filter(
        (b) => b.status === "pending_payment" || b.status === "paid" || b.status === "pending_approval",
      )
      const cancelledBookings = bookings.filter((b) => b.status === "cancelled" || b.status === "rejected")

      // Add refund messages to cancelled bookings
      const cancelledWithMessages = cancelledBookings.map((b) => ({
        ...b.toObject(),
        refundMessage: getRefundMessage(b),
      }))

      res.render("bookings/guest-dashboard", {
        bookings,
        upcomingTrips,
        pastTrips,
        pendingBookings,
        cancelledBookings: cancelledWithMessages,
      })
    } catch (err) {
      console.error("Guest dashboard error:", err)
      req.flash("error", "Error loading your trips")
      res.redirect("/listings")
    }
  },
}
