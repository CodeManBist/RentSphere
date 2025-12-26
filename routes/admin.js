const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin")
const { isAdmin } = require("../middleware")

// All routes require admin authentication
router.use(isAdmin)

// Dashboard
router.get("/dashboard", adminController.dashboard)

// User management
router.get("/users", adminController.viewUsers)
router.post("/users/:userId/toggle-block", adminController.toggleBlockUser)
router.delete("/users/:userId", adminController.deleteUser)

// Booking management
router.get("/bookings", adminController.viewBookings)

router.get("/listings", adminController.viewListings)
router.post("/listings/:listingId/approve", adminController.approveListing)
router.post("/listings/:listingId/reject", adminController.rejectListing)

// Review moderation
router.get("/reviews", adminController.viewReviews)
router.delete("/reviews/:reviewId", adminController.deleteReview)

// Seasonal pricing
router.get("/seasonal-pricing", adminController.viewSeasonalPricing)

// Payment logs
router.get("/payment-logs", adminController.viewPaymentLogs)

module.exports = router
