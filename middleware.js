const Listing = require("./Models/listing");
const Review = require("./Models/review");
const ExpressError = require("./utils/ExpressError");
const { listingSchema, reviewSchema } = require("./schema");
const mongoose = require("mongoose");

// ----------------------------
// LOGIN CHECK
// ----------------------------
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// ----------------------------
// VALIDATE OBJECT ID
// ----------------------------
module.exports.validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      req.flash("error", `Invalid ${paramName}`);
      return res.redirect("/listings");
    }
    next();
  };
};

// ----------------------------
// OWNER CHECK — ADMIN ALWAYS ALLOWED
// ----------------------------
module.exports.isOwner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    // Admin bypass
    if (req.user.role === "admin") return next();

    if (!listing.owner || !listing.owner.equals(req.user._id)) {
      req.flash("error", "You are not the owner of this listing");
      return res.redirect(`/listings/${id}`);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// HOST CHECK — ONLY HOSTS, NOT ADMIN
// ----------------------------
module.exports.isHost = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in");
    return res.redirect("/login");
  }

  // ONLY HOST → ALLOWED
  if (req.user.role !== "host") {
    req.flash("error", "Only hosts can access this feature");
    return res.redirect("/listings");
  }

  next();
};

// ----------------------------
// ADMIN CHECK ONLY
// ----------------------------
module.exports.isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in");
    return res.redirect("/login");
  }

  if (req.user.role !== "admin") {
    req.flash("error", "Access denied. Admin only.");
    return res.redirect("/listings");
  }

  next();
};

// ----------------------------
// ADMIN OR OWNER
// ----------------------------
module.exports.isAdminOrOwner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    if (
      req.user.role === "admin" ||
      (listing.owner && listing.owner.equals(req.user._id))
    ) {
      return next();
    }

    req.flash("error", "You are not authorized to do this");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// LISTING VALIDATION
// ----------------------------
module.exports.validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, msg);
  }
  next();
};

// ----------------------------
// REVIEW VALIDATION
// ----------------------------
module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, msg);
  }
  next();
};

// ----------------------------
// REVIEW AUTHOR — ADMIN ALSO ALLOWED
// ----------------------------
module.exports.isReviewAuthor = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      req.flash("error", "Review not found");
      return res.redirect(`/listings/${id}`);
    }

    if (req.user.role === "admin") return next();

    if (!review.author.equals(req.user._id)) {
      req.flash("error", "You are not the author of this review");
      return res.redirect(`/listings/${id}`);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// BLOCKED USER
// ----------------------------
module.exports.isNotBlocked = (req, res, next) => {
  if (req.user && req.user.isBlocked) {
    req.logout((err) => {
      if (err) return next(err);
      req.flash("error", "Your account has been suspended.");
      return res.redirect("/login");
    });
    return;
  }
  next();
};

// ----------------------------
// PAYMENT RATE LIMIT
// ----------------------------
const paymentAttempts = new Map();

module.exports.preventDoublePayment = (req, res, next) => {
  const { bookingId } = req.params;
  const key = `${req.user._id}_${bookingId}`;
  const now = Date.now();
  const last = paymentAttempts.get(key);

  if (last && now - last < 10000) {
    req.flash("error", "Please wait before trying again.");
    return res.redirect(`/bookings/booking/${bookingId}`);
  }

  paymentAttempts.set(key, now);
  next();
};

// ----------------------------
// LOGIN RATE LIMITER
// ----------------------------
const loginAttempts = new Map();

module.exports.loginRateLimiter = (req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  if (now - record.firstAttempt > windowMs) {
    record.count = 0;
    record.firstAttempt = now;
  }

  record.count++;
  loginAttempts.set(ip, record);

  if (record.count > maxAttempts) {
    req.flash("error", "Too many login attempts. Try later.");
    return res.redirect("/login");
  }

  next();
};

module.exports.attachSafeOwner = (req, res, next) => {
  res.locals.safeOwner = (owner) => {
    if (!owner) {
      return { username: "deleted_user", email: "N/A", role: "guest" };
    }
    return owner;
  };
  next();
};
