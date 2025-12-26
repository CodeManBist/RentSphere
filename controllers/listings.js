const Listing = require("../Models/listing");
const Availability = require("../Models/availability");

const {
  CATEGORIES,
  getParentCategories,
  getSubcategories,
  getAllCategoriesFlat,
  isValidCategory,
} = require("../utils/categoryConfig");

const {
  getRecommendations,
  getPopularByCategory,
  getTrendingListings,
} = require("../utils/recommendations");

const {
  parseSearchQuery,
  buildMongoQuery,
  buildGeoQuery,
  calculateRelevanceScore,
  getAutocompleteSuggestions,
} = require("../utils/searchParser");


// ----------------------- INDEX PAGE -----------------------
module.exports.index = async (req, res) => {
  const { parentCategory, category } = req.query;

  const query = { status: "active" };

  if (parentCategory) query.parentCategory = parentCategory;
  if (category) query.category = category;

  let allListings = await Listing.find(query).populate("owner", "username");
  allListings = allListings.filter((l) => l.owner != null);

  const categories = getAllCategoriesFlat();
  const parentCategories = getParentCategories();

  res.render("listings/index", {
    allListings,
    categories,
    parentCategories,
    selectedParent: parentCategory || null,
    selectedCategory: category || null,
  });
};


// ----------------------- RENDER NEW LISTING FORM -----------------------
module.exports.renderNewForm = (req, res) => {
  const parentCategories = getParentCategories();
  const allCategories = CATEGORIES;

  res.render("listings/new", { parentCategories, allCategories });
};


// ----------------------- SHOW LISTING -----------------------
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: { path: "author" },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  if (listing.status === "deleted") {
    req.flash("error", "This listing has been removed.");
    return res.redirect("/listings");
  }

  const recommendations = await getRecommendations(id, 4);

  const { getCurrentSeason, getSeasonsConfig } = require("../utils/seasonalPricing");
  const currentSeason = getCurrentSeason();

  res.render("listings/show", {
    listing,
    recommendations,
    currentSeason,
    seasonsConfig: getSeasonsConfig(),
  });
};


// ----------------------- CREATE LISTING -----------------------
module.exports.createListing = async (req, res, next) => {
  if (!req.file) {
    req.flash("error", "Image is required!");
    return res.redirect("/listings/new");
  }

  const url = req.file.path;
  const filename = req.file.filename;

  const { listing } = req.body;

  if (!isValidCategory(listing.parentCategory, listing.category)) {
    req.flash("error", "Invalid category selected!");
    return res.redirect("/listings/new");
  }

  const newListing = new Listing({
    title: listing.title,
    description: listing.description,
    price: listing.price,
    location: listing.location,
    country: listing.country,
    parentCategory: listing.parentCategory,
    category: listing.category,
    pricingUnit: listing.pricingUnit || "night",
    maxGuests: listing.maxGuests || 4,
    categoryFields: listing.categoryFields || {},
    policies: {
      petsAllowed: listing.petsAllowed === "true",
      smokingAllowed: listing.smokingAllowed === "true",
      cancellationPolicy: listing.cancellationPolicy || "moderate",
    },
    bookingSettings: {
      minStay: listing.minStay || 1,
      maxStay: listing.maxStay || 30,
      checkInTime: listing.checkInTime || "15:00",
      checkOutTime: listing.checkOutTime || "11:00",
      instantBook: listing.instantBook === "true",
    },
    status: req.user.role === "admin" ? "active" : "pending_approval",
  });

  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  // Geocoding
  if (newListing.location && newListing.country) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const q = encodeURIComponent(`${newListing.location}, ${newListing.country}`);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`, {
        headers: { "User-Agent": "RentSphere-app/1.0" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await resp.json();

      if (Array.isArray(data) && data[0]) {
        const lat = Number.parseFloat(data[0].lat);
        const lon = Number.parseFloat(data[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          newListing.geometry = { type: "Point", coordinates: [lon, lat] };
        }
      }
    } catch (e) {
      console.log("Geocoding skipped:", e.name === "AbortError" ? "timeout" : e.message);
    }
  }

  await newListing.save();

  if (newListing.status === "pending_approval") {
    req.flash("success", "Listing submitted for review! It will be visible once approved by admin.");
  } else {
    req.flash("success", "New Listing Created!");
  }

  res.redirect("/listings");
};


// ----------------------- EDIT LISTING -----------------------
module.exports.editListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  const parentCategories = getParentCategories();
  const allCategories = CATEGORIES;

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit", {
    listing,
    originalImageUrl,
    parentCategories,
    allCategories,
  });
};


// ----------------------- UPDATE LISTING -----------------------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const { listing } = req.body;

  const updateData = {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    location: listing.location,
    country: listing.country,
    parentCategory: listing.parentCategory,
    category: listing.category,
    pricingUnit: listing.pricingUnit,
    maxGuests: listing.maxGuests,
    categoryFields: listing.categoryFields || {},
    "policies.petsAllowed": listing.petsAllowed === "true",
    "policies.smokingAllowed": listing.smokingAllowed === "true",
    "policies.cancellationPolicy": listing.cancellationPolicy,
    "bookingSettings.minStay": listing.minStay,
    "bookingSettings.maxStay": listing.maxStay,
    "bookingSettings.checkInTime": listing.checkInTime,
    "bookingSettings.checkOutTime": listing.checkOutTime,
    "bookingSettings.instantBook": listing.instantBook === "true",
  };

  const updatedListing = await Listing.findByIdAndUpdate(id, updateData, { new: true });

  if (!updatedListing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  if (req.file) {
    updatedListing.image = { url: req.file.path, filename: req.file.filename };
    await updatedListing.save();
  }

  // Update geocoding
  if (updatedListing.location && updatedListing.country) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const q = encodeURIComponent(`${updatedListing.location}, ${updatedListing.country}`);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`, {
        headers: { "User-Agent": "RentSphere-app/1.0" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await resp.json();

      if (Array.isArray(data) && data[0]) {
        const lat = Number.parseFloat(data[0].lat);
        const lon = Number.parseFloat(data[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          updatedListing.geometry = { type: "Point", coordinates: [lon, lat] };
          await updatedListing.save();
        }
      }
    } catch {}
  }

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};


// ----------------------- DELETE (SOFT DELETE) -----------------------
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;

  await Listing.findByIdAndUpdate(id, { status: "deleted" });

  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};


// ----------------------- SEARCH LISTINGS (FIXED!) -----------------------
module.exports.searchListings = async (req, res) => {
  try {
    const {
      q,
      city,
      parentCategory,
      category,
      minPrice,
      maxPrice,
      guests,
      checkIn,
      checkOut,
      amenities,
      petsAllowed,
      sortBy,
      lat,
      lng,
      radius,
    } = req.query;

    const searchQuery = q || city || "";
    const parsedParams = parseSearchQuery(searchQuery);

    // ---------------- FIX: Guarantee amenities is always an array ----------------
    if (!Array.isArray(parsedParams.amenities)) {
      parsedParams.amenities = parsedParams.amenities
        ? [parsedParams.amenities]
        : [];
    }
    // -------------------------------------------------------------------------------

    if (parentCategory) parsedParams.parentCategory = parentCategory;
    if (category) parsedParams.category = category;
    if (minPrice) parsedParams.minPrice = parseInt(minPrice);
    if (maxPrice) parsedParams.maxPrice = parseInt(maxPrice);
    if (guests) parsedParams.guests = parseInt(guests);
    if (checkIn) parsedParams.checkIn = new Date(checkIn);
    if (checkOut) parsedParams.checkOut = new Date(checkOut);

    if (petsAllowed === "true") parsedParams.amenities.push("petsAllowed");

    if (amenities) {
      const list = Array.isArray(amenities) ? amenities : amenities.split(",");
      parsedParams.amenities = [...new Set([...parsedParams.amenities, ...list])];
    }

    if (radius) parsedParams.radius = parseInt(radius);
    if (sortBy) parsedParams.sortBy = sortBy;

    let query = buildMongoQuery(parsedParams);

    if (lat && lng) {
      const geoQuery = buildGeoQuery([parseFloat(lng), parseFloat(lat)], parsedParams.radius || 10);
      query = { ...query, ...geoQuery };
    }

    if (parsedParams.checkIn && parsedParams.checkOut) {
      const unavailableRecords = await Availability.find({
        date: { $gte: parsedParams.checkIn, $lte: parsedParams.checkOut },
        available: false,
      }).distinct("listing");

      if (unavailableRecords.length > 0) {
        query._id = { $nin: unavailableRecords };
      }
    }

    let listings = await Listing.find(query)
      .populate("owner", "username")
      .lean();

    listings = listings.map((listing) => ({
      ...listing,
      relevanceScore: calculateRelevanceScore(listing, parsedParams),
    }));

    switch (parsedParams.sortBy) {
      case "price_low":
        listings.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        listings.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "rating":
        listings.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
        break;
      default:
        listings.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({
        success: true,
        count: listings.length,
        listings,
        parsedQuery: parsedParams,
      });
    }

    const categories = getAllCategoriesFlat();
    const parentCategories = getParentCategories();

    res.render("listings/index", {
      allListings: listings,
      categories,
      parentCategories,
      selectedParent: parsedParams.parentCategory || null,
      selectedCategory: parsedParams.category || null,
      searchParams: {
        q: searchQuery,
        ...parsedParams,
        checkIn: parsedParams.checkIn?.toISOString().split("T")[0],
        checkOut: parsedParams.checkOut?.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "An error occurred while searching. Please try again.");
    res.redirect("/listings");
  }
};


// ----------------------- AUTOCOMPLETE -----------------------
module.exports.getAutocompleteSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = getAutocompleteSuggestions(q);

    const titleMatches = await Listing.find({
      status: "active",
      title: { $regex: q, $options: "i" },
    })
      .select("title location")
      .limit(5)
      .lean();

    const titleSuggestions = titleMatches.map((l) => ({
      type: "listing",
      value: l.title,
      subtitle: l.location,
      icon: "fa-home",
    }));

    const locationMatches = await Listing.distinct("location", {
      status: "active",
      location: { $regex: q, $options: "i" },
    });

    const locationSuggestions = locationMatches.slice(0, 5).map((loc) => ({
      type: "location",
      value: loc,
      icon: "fa-location-dot",
    }));

    const allSuggestions = [...suggestions, ...locationSuggestions, ...titleSuggestions];
    const unique = [...new Map(allSuggestions.map((s) => [s.value, s])).values()];

    res.json({ suggestions: unique.slice(0, 10) });
  } catch (error) {
    console.error("Autocomplete error:", error);
    res.json({ suggestions: [] });
  }
};


// ----------------------- ADVANCED SEARCH API -----------------------
module.exports.advancedSearchApi = async (req, res) => {
  try {
    const parsedParams = parseSearchQuery(req.query.q || "");

    Object.assign(parsedParams, {
      parentCategory: req.query.parentCategory || parsedParams.parentCategory,
      category: req.query.category || parsedParams.category,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : parsedParams.minPrice,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : parsedParams.maxPrice,
      guests: req.query.guests ? parseInt(req.query.guests) : parsedParams.guests,
    });

    const query = buildMongoQuery(parsedParams);

    if (req.query.lat && req.query.lng) {
      const geoQuery = buildGeoQuery(
        [parseFloat(req.query.lng), parseFloat(req.query.lat)],
        parseInt(req.query.radius) || 10
      );
      Object.assign(query, geoQuery);
    }

    let listings = await Listing.find(query)
      .populate("owner", "username")
      .select("title price location country image category parentCategory maxGuests")
      .limit(50)
      .lean();

    listings = listings.map((listing) => ({
      ...listing,
      relevanceScore: calculateRelevanceScore(listing, parsedParams),
    }));

    listings.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      success: true,
      count: listings.length,
      query: parsedParams,
      listings,
    });
  } catch (error) {
    console.error("Advanced search API error:", error);
    res.status(500).json({ success: false, error: "Search failed" });
  }
};


// ----------------------- FILTER BY CATEGORY -----------------------
module.exports.filterByCategory = async (req, res) => {
  const { parentCategory, category } = req.params;

  const query = { status: "active" };

  if (parentCategory && parentCategory !== "all") query.parentCategory = parentCategory;
  if (category && category !== "all") query.category = category;

  const listings = await Listing.find(query).populate("owner", "username");
  const categories = getAllCategoriesFlat();
  const parentCategories = getParentCategories();

  res.render("listings/index", {
    allListings: listings,
    categories,
    parentCategories,
    selectedParent: parentCategory,
    selectedCategory: category,
  });
};


// ----------------------- GET SUBCATEGORIES API -----------------------
module.exports.getSubcategoriesApi = (req, res) => {
  const { parentCategory } = req.params;
  const subcategories = getSubcategories(parentCategory);
  res.json(subcategories);
};
