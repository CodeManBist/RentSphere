const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync');
const Review = require('../Models/review');
const Listing = require('../Models/listing');

const { 
    validateReview, 
    isLoggedIn, 
    isReviewAuthor 
} = require('../middleware');

const reviewController = require('../controllers/reviews');

// POST Review Route
router.post(
    '/', 
    isLoggedIn,
    validateReview,
    wrapAsync(reviewController.createReview)
);

// DELETE Review Route
router.delete(
    '/:reviewId',
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reviewController.destroyReview)
);

module.exports = router;
