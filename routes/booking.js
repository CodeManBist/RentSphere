const express = require("express")
const router = express.Router()
const wrapAsync = require("../utils/wrapAsync")
const { isLoggedIn } = require("../middleware")
const bookingController = require("../controllers/booking")

// Listing-specific booking routes
router.get("/:listingId/check-availability", wrapAsync(bookingController.checkAvailability))

router.get("/:listingId/calendar", wrapAsync(bookingController.getCalendar))

router.get("/:listingId/book", isLoggedIn, wrapAsync(bookingController.showBookingForm))

router.post("/:listingId/book", isLoggedIn, wrapAsync(bookingController.createBooking))

// Booking management routes
router.get("/booking/:bookingId", isLoggedIn, wrapAsync(bookingController.showBooking))

router.post("/booking/:bookingId/accept", isLoggedIn, wrapAsync(bookingController.acceptBooking))
router.post("/booking/:bookingId/reject", isLoggedIn, wrapAsync(bookingController.rejectBooking))
router.post("/booking/:bookingId/cancel", isLoggedIn, wrapAsync(bookingController.cancelBooking))

// Legacy route for backward compatibility
router.post("/booking/:bookingId/confirm", isLoggedIn, wrapAsync(bookingController.acceptBooking))

// Dashboards
router.get("/host/dashboard", isLoggedIn, wrapAsync(bookingController.hostDashboard))
router.get("/guest/dashboard", isLoggedIn, wrapAsync(bookingController.guestDashboard))

module.exports = router
