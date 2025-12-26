require("dotenv").config();

const mongoose = require("mongoose");
const initData = require("./data.js");

const User = require("../Models/user.js");
const Listing = require("../Models/listing.js");
const Availability = require("../Models/availability.js");

const MONGO_URL = process.env.ATLASDB_URL;

main()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  try {
    console.log("Dropping database...");
    await mongoose.connection.dropDatabase();
    console.log("Database cleared!");

    // -----------------------------
    // 🔥 CREATE ADMIN USER
    // -----------------------------
    console.log("Creating admin user...");
    const admin = new User({
      username: "admin",
      email: "admin@stayhive.com",
      role: "admin",               // ✅ FIXED: admin role
      savedListings: [],
      searchHistory: [],
      preferences: {
        preferredCategories: [],
        preferredLocations: [],
        priceRange: { min: 0, max: 50000 },
      },
    });

    const registeredAdmin = await User.register(admin, "admin123");
    console.log(
      "Admin created:",
      registeredAdmin.username,
      "(role:",
      registeredAdmin.role + ")"
    );

    const adminId = registeredAdmin._id;

    // -----------------------------
    // 🔥 CREATE GUEST USER
    // -----------------------------
    console.log("Creating sample guest user...");
    const guest = new User({
      username: "guest",
      email: "guest@stayhive.com",
      role: "guest",                // ✅ FIXED: guest role
      savedListings: [],
      searchHistory: [],
      preferences: {
        preferredCategories: ["stays"],
        preferredLocations: ["Goa", "Mumbai"],
        priceRange: { min: 1000, max: 10000 },
      },
    });

    const registeredGuest = await User.register(guest, "guest123");
    console.log("Guest created:", registeredGuest.username);

    // -----------------------------
    // 🔥 INSERT LISTINGS OWNED BY ADMIN
    // -----------------------------
    console.log("Preparing listings with owner...");
    const listingsWithOwner = initData.data.map((listing) => ({
      ...listing,
      owner: adminId,
      status: "active",
      isFeatured: Math.random() > 0.7,
    }));

    console.log("Seeding listings...");
    const insertedListings = await Listing.insertMany(listingsWithOwner);
    console.log(`Inserted ${insertedListings.length} listings`);

    // -----------------------------
    // 🔥 CREATE 90-DAY AVAILABILITY
    // -----------------------------
    console.log("Creating availability records...");
    const today = new Date();
    const availabilityRecords = [];

    for (const listing of insertedListings) {
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);

        availabilityRecords.push({
          listing: listing._id,
          date: date,
          isAvailable: true,
          price: listing.price,
        });
      }
    }

    // Insert in batches
    const batchSize = 1000;
    for (let i = 0; i < availabilityRecords.length; i += batchSize) {
      const batch = availabilityRecords.slice(i, i + batchSize);
      await Availability.insertMany(batch);
      console.log(
        `Inserted availability batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          availabilityRecords.length / batchSize
        )}`
      );
    }

    console.log(`Created ${availabilityRecords.length} availability records`);

    console.log("\n========== SEED COMPLETE ==========");
    console.log(`Users: 2 (admin + guest)`);
    console.log(`Listings: ${insertedListings.length}`);
    console.log(`Availability records: ${availabilityRecords.length}`);
    console.log("\nTest Accounts:");
    console.log("  Admin: admin@stayhive.com / admin123");
    console.log("  Guest: guest@stayhive.com / guest123");
    console.log("====================================\n");

  } catch (err) {
    console.log("Error seeding DB:", err);
  } finally {
    mongoose.connection.close();
  }
};

initDB();
