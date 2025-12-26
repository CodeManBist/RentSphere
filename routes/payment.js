const express = require("express")
const router = express.Router()
const wrapAsync = require("../utils/wrapAsync")
const { isLoggedIn } = require("../middleware")
const paymentController = require("../controllers/payment")

// Initiate payment for existing booking
router.get("/pay/:bookingId", isLoggedIn, wrapAsync(paymentController.initiatePayment))

// Create booking and pay in one step (legacy support)
router.post("/pay/:listingId", isLoggedIn, wrapAsync(paymentController.createBookingAndPay))

// Cashfree return URL
router.get("/cashfree-return", wrapAsync(paymentController.cashfreeReturn))

module.exports = router
