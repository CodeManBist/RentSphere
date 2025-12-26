const User = require("../Models/user")
const Listing = require("../Models/listing")
const Booking = require("../Models/booking")
const Review = require("../Models/review")
const PaymentLog = require("../Models/paymentLog")
const SeasonalPricingRule = require("../Models/seasonalPricingRule")
const mongoose = require("mongoose")

// Dashboard with statistics
module.exports.dashboard = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments()
    const totalListings = await Listing.countDocuments({ status: "active" })
    const totalBookings = await Booking.countDocuments()
    const totalReviews = await Review.countDocuments()
    const pendingListings = await Listing.countDocuments({ status: "pending_approval" })

    // Get revenue stats
    const revenueStats = await Booking.aggregate([
      { $match: { "payment.status": "paid" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.total" },
          totalBookings: { $sum: 1 },
          avgBookingValue: { $avg: "$pricing.total" },
        },
      },
    ])

    const revenue = revenueStats[0] || { totalRevenue: 0, totalBookings: 0, avgBookingValue: 0 }

    // Get monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          "payment.status": "paid",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$pricing.total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    // Get top listings by bookings
    const topListings = await Booking.aggregate([
      { $match: { status: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: "$listing", bookingCount: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "listings",
          localField: "_id",
          foreignField: "_id",
          as: "listing",
        },
      },
      { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },
      { $match: { listing: { $ne: null } } },
    ])

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate("listing", "title")
      .populate("guest", "username email")
      .populate("host", "username")
      .sort({ createdAt: -1 })
      .limit(10)

    // User role distribution
    const userStats = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])

    res.render("admin/dashboard", {
      totalUsers,
      totalListings,
      totalBookings,
      totalReviews,
      pendingListings,
      revenue,
      monthlyRevenue,
      topListings,
      recentBookings,
      userStats,
    })
  } catch (err) {
    console.error("Admin dashboard error:", err)
    req.flash("error", "Error loading dashboard")
    res.redirect("/listings")
  }
}

// View all users
module.exports.viewUsers = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.role) filter.role = req.query.role
    if (req.query.blocked === "true") filter.isBlocked = true
    if (req.query.search) {
      const sanitizedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      filter.$or = [
        { username: { $regex: sanitizedSearch, $options: "i" } },
        { email: { $regex: sanitizedSearch, $options: "i" } },
      ]
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

    const totalUsers = await User.countDocuments(filter)
    const totalPages = Math.ceil(totalUsers / limit)

    res.render("admin/users", {
      users,
      currentPage: page,
      totalPages,
      totalUsers,
      query: req.query,
    })
  } catch (err) {
    console.error("Admin users error:", err)
    req.flash("error", "Error loading users")
    res.redirect("/admin/dashboard")
  }
}

// Block/Unblock user
module.exports.toggleBlockUser = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      req.flash("error", "Invalid user ID")
      return res.redirect("/admin/users")
    }

    const user = await User.findById(userId)

    if (!user) {
      req.flash("error", "User not found")
      return res.redirect("/admin/users")
    }

    if (user.role === "admin") {
      req.flash("error", "Cannot block admin users")
      return res.redirect("/admin/users")
    }

    user.isBlocked = !user.isBlocked
    await user.save()

    req.flash("success", `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`)
    res.redirect("/admin/users")
  } catch (err) {
    console.error("Toggle block user error:", err)
    req.flash("error", "Error updating user")
    res.redirect("/admin/users")
  }
}

// Delete user
module.exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      req.flash("error", "Invalid user ID")
      return res.redirect("/admin/users")
    }

    const user = await User.findById(userId)

    if (!user) {
      req.flash("error", "User not found")
      return res.redirect("/admin/users")
    }

    if (user.role === "admin") {
      req.flash("error", "Cannot delete admin users")
      return res.redirect("/admin/users")
    }

    await User.findByIdAndDelete(userId)

    req.flash("success", "User deleted successfully")
    res.redirect("/admin/users")
  } catch (err) {
    console.error("Delete user error:", err)
    req.flash("error", "Error deleting user")
    res.redirect("/admin/users")
  }
}

// View all bookings
module.exports.viewBookings = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const bookings = await Booking.find(filter)
      .populate("listing", "title")
      .populate("guest", "username email")
      .populate("host", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalBookings = await Booking.countDocuments(filter)
    const totalPages = Math.ceil(totalBookings / limit)

    res.render("admin/bookings", {
      bookings,
      currentPage: page,
      totalPages,
      totalBookings,
      query: req.query,
    })
  } catch (err) {
    console.error("Admin bookings error:", err)
    req.flash("error", "Error loading bookings")
    res.redirect("/admin/dashboard")
  }
}

module.exports.viewListings = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status) {
      filter.status = req.query.status
    }
    if (req.query.search) {
      const sanitizedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: "i" } },
        { location: { $regex: sanitizedSearch, $options: "i" } },
      ]
    }

    const listings = await Listing.find(filter)
      .populate("owner", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalListings = await Listing.countDocuments(filter)
    const totalPages = Math.ceil(totalListings / limit)

    // Get pending count for badge
    const pendingCount = await Listing.countDocuments({ status: "pending_approval" })

    res.render("admin/listings", {
      listings,
      currentPage: page,
      totalPages,
      totalListings,
      pendingCount,
      query: req.query,
    })
  } catch (err) {
    console.error("Admin listings error:", err)
    req.flash("error", "Error loading listings")
    res.redirect("/admin/dashboard")
  }
}

module.exports.approveListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      req.flash("error", "Invalid listing ID");
      return res.redirect("/admin/listings");
    }

    const listing = await Listing.findById(listingId).populate("owner");

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/admin/listings");
    }

    // 1️⃣ Approve the listing
    listing.status = "active";
    await listing.save();

    // 2️⃣ Promote the owner to HOST if they are still a guest
    const owner = listing.owner;

    if (owner && owner.role === "guest") {
      owner.role = "host";
      await owner.save();
      req.flash(
        "success",
        `Listing "${listing.title}" approved, and ${owner.username} is now upgraded to HOST!`
      );
    } else {
      req.flash(
        "success",
        `Listing "${listing.title}" approved and is now live!`
      );
    }

    res.redirect("/admin/listings?status=pending_approval");
  } catch (err) {
    console.error("Approve listing error:", err);
    req.flash("error", "Error approving listing");
    res.redirect("/admin/listings");
  }
};

// Reject a listing
module.exports.rejectListing = async (req, res) => {
  try {
    const { listingId } = req.params
    const { reason } = req.body

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      req.flash("error", "Invalid listing ID")
      return res.redirect("/admin/listings")
    }

    const listing = await Listing.findById(listingId)

    if (!listing) {
      req.flash("error", "Listing not found")
      return res.redirect("/admin/listings")
    }

    listing.status = "rejected"
    listing.rejectionReason = reason || "Does not meet platform guidelines"
    await listing.save()

    req.flash("success", `Listing "${listing.title}" has been rejected`)
    res.redirect("/admin/listings?status=pending_approval")
  } catch (err) {
    console.error("Reject listing error:", err)
    req.flash("error", "Error rejecting listing")
    res.redirect("/admin/listings")
  }
}

// View all reviews with moderation
module.exports.viewReviews = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const reviews = await Review.find().populate("author", "username").sort({ createdAt: -1 }).skip(skip).limit(limit)

    const totalReviews = await Review.countDocuments()
    const totalPages = Math.ceil(totalReviews / limit)

    res.render("admin/reviews", {
      reviews,
      currentPage: page,
      totalPages,
      totalReviews,
    })
  } catch (err) {
    console.error("Admin reviews error:", err)
    req.flash("error", "Error loading reviews")
    res.redirect("/admin/dashboard")
  }
}

// Delete review (moderation)
module.exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      req.flash("error", "Invalid review ID")
      return res.redirect("/admin/reviews")
    }

    // Find the review to get the listing reference
    const review = await Review.findById(reviewId)
    if (!review) {
      req.flash("error", "Review not found")
      return res.redirect("/admin/reviews")
    }

    // Remove review reference from listings
    await Listing.updateMany({ reviews: reviewId }, { $pull: { reviews: reviewId } })

    // Delete the review
    await Review.findByIdAndDelete(reviewId)

    req.flash("success", "Review deleted successfully")
    res.redirect("/admin/reviews")
  } catch (err) {
    console.error("Delete review error:", err)
    req.flash("error", "Error deleting review")
    res.redirect("/admin/reviews")
  }
}

// Manage seasonal pricing rules (global)
module.exports.viewSeasonalPricing = async (req, res) => {
  try {
    const { getSeasonsConfig } = require("../utils/seasonalPricing")
    const globalConfig = getSeasonsConfig()

    // Get listing-specific rules with safe error handling
    let customRules = []
    try {
      customRules = await SeasonalPricingRule.find()
        .populate("listing", "title")
        .populate("owner", "username")
        .sort({ createdAt: -1 })
        .limit(50)
    } catch (e) {
      // SeasonalPricingRule model might not exist yet
      console.log("SeasonalPricingRule not available:", e.message)
    }

    res.render("admin/seasonal-pricing", {
      globalConfig,
      customRules,
    })
  } catch (err) {
    console.error("Seasonal pricing error:", err)
    req.flash("error", "Error loading seasonal pricing")
    res.redirect("/admin/dashboard")
  }
}

// Payment logs
module.exports.viewPaymentLogs = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 30
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.type) filter.type = req.query.type

    let logs = []
    let totalLogs = 0
    try {
      logs = await PaymentLog.find(filter)
        .populate("booking")
        .populate("user", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
      totalLogs = await PaymentLog.countDocuments(filter)
    } catch (e) {
      // PaymentLog model might not exist yet
      console.log("PaymentLog not available:", e.message)
    }

    const totalPages = Math.ceil(totalLogs / limit)

    res.render("admin/payment-logs", {
      logs,
      currentPage: page,
      totalPages,
      totalLogs,
      query: req.query,
    })
  } catch (err) {
    console.error("Payment logs error:", err)
    req.flash("error", "Error loading payment logs")
    res.redirect("/admin/dashboard")
  }
}

module.exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      req.flash("error", "Invalid user ID")
      return res.redirect("/admin/users")
    }

    const validRoles = ["guest", "host", "admin"]
    if (!validRoles.includes(role)) {
      req.flash("error", "Invalid role")
      return res.redirect("/admin/users")
    }

    const user = await User.findById(userId)
    if (!user) {
      req.flash("error", "User not found")
      return res.redirect("/admin/users")
    }

    // Prevent changing own role
    if (user._id.equals(req.user._id)) {
      req.flash("error", "Cannot change your own role")
      return res.redirect("/admin/users")
    }

    user.role = role
    await user.save()

    req.flash("success", `User role changed to ${role}`)
    res.redirect("/admin/users")
  } catch (err) {
    console.error("Change role error:", err)
    req.flash("error", "Error changing user role")
    res.redirect("/admin/users")
  }
}
