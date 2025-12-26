const express = require("express")
const router = express.Router()
const wrapAsync = require("../utils/wrapAsync")
const { isLoggedIn, isOwner, validateListing } = require("../middleware")
const listingController = require("../controllers/listings")
const multer = require("multer")
const { storage } = require("../cloudConfig")
const upload = multer({ storage })

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(isLoggedIn, upload.single("listing[image]"), validateListing, wrapAsync(listingController.createListing))

// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm)

router.get("/search", wrapAsync(listingController.searchListings))

router.get("/api/autocomplete", wrapAsync(listingController.getAutocompleteSuggestions))

router.get("/api/search", wrapAsync(listingController.advancedSearchApi))

router.get("/category/:parentCategory", wrapAsync(listingController.filterByCategory))
router.get("/category/:parentCategory/:category", wrapAsync(listingController.filterByCategory))

router.get("/api/subcategories/:parentCategory", listingController.getSubcategoriesApi)

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing),
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing))

// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.editListing))

module.exports = router
