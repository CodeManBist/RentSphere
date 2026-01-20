# 🏠 RentSphere — Smart Multi-Category Rental Website

RentSphere is a full-stack multi-category rental platform built with Node.js, Express, MongoDB and EJS. It provides listing discovery, advanced filters, reviews, booking support, image uploads (Cloudinary), season-based pricing and an in-app chatbot assistant. This README replaces and improves the existing README with clearer setup, usage, and deployment instructions.

Table of Contents
- Features
- Tech stack
- Live demo
- Project structure
- Prerequisites
- Installation
- Configuration / Environment Variables
- Seeding the database
- Running the app
- Important files
- Tips & deployment notes
- Contributing
- License
- Author


Features
- Multi-category rental listings (stays, equipment, etc.)
- Advanced search & filters (price, category, ratings, availability)
- Season-based pricing and dynamic pricing filters
- User accounts: signup, login (Passport + sessions)
- Reviews & ratings for listings
- CRUD management for listings (hosts / admin)
- Booking flow and availability records
- Image upload using Cloudinary
- Smart in-app Chatbot Assistant (UI in templates)
- DB seeding script for demo data

Tech stack
- Backend: Node.js + Express
- Templating: EJS (server-side rendering)
- Database: MongoDB + Mongoose
- Auth: Passport.js (LocalStrategy)
- File uploads / storage: Cloudinary + multer-storage-cloudinary
- Styling: CSS + Bootstrap

Live demo
If a live demo is available it is listed in the repository README (example: https://project1-2tfo.onrender.com/listings). If you run the app locally you can access it at http://localhost:3000/listings by default.

Project structure (high level)
RentSphere/
├── Models/            # Mongoose models (Listing, User, Availability, etc.)
├── controllers/       # Business logic (listings, users, bookings, reviews)
├── routes/            # Express routers
├── views/             # EJS templates and partials
├── public/            # Static assets (css, js, images)
├── init/              # Seed scripts (init/index.js, init/data.js)
├── utils/             # Helpers and utilities
├── cloudConfig.js     # Cloudinary config
├── app.js             # App entry point
├── package.json

Prerequisites
- Node.js (v14+)
- npm
- MongoDB (local or Atlas)
- Cloudinary account (optional, required for image uploads)

Installation
1. Clone the repo
   git clone https://github.com/CodeManBist/RentSphere.git
   cd RentSphere

2. Install dependencies
   npm install

Configuration / Environment Variables
Create a `.env` file in the project root (you may copy from a sample if provided). Minimum variables used by the app:

```
PORT=3000
ATLASDB_URL=your_mongodb_connection_string
SESSION_SECRET=some_secure_secret
CLOUD_NAME=your_cloudinary_cloud_name   # optional if using Cloudinary
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

Seeding the database (demo data)
A seed script is included under `init/`. To seed the database (will drop existing DB):

```
node init/index.js
```

The seeder creates sample `admin` and `guest` accounts and populates listings and availability records. Test accounts printed by the seeder:
- Admin: admin@rentsphere.com / admin123
- Guest: guest@rentsphere.com / guest123

Running the app
Start in development (using nodemon recommended):

```
npm run dev   # or nodemon app.js
```

Open http://localhost:3000 (or the port you set in .env)

Important files and directories
- app.js — main Express app and middleware setup
- Models/ — Mongoose model definitions
- controllers/ — controllers for listings, users, bookings, payments, reviews
- routes/ — route definitions and routers
- views/ — EJS templates (layouts, includes, listing pages)
- init/ — seeding scripts and initial demo data (init/index.js and init/data.js)
- cloudConfig.js — Cloudinary config and multer storage
- public/ — static assets (css, images, js)

Tips & deployment notes
- Do not commit your `.env` or secrets. Use environment variables on hosting platforms.
- For production, set `NODE_ENV=production` and use a managed MongoDB instance (Atlas) and secure session store.
- Use a process manager (PM2, systemd) and enable HTTPS via a reverse proxy (Nginx) or platform features.
- Cloudinary handles image uploads; ensure the Cloudinary credentials are set in the environment.
- If you seed the DB, note that the seeder drops the database before inserting demo data.

Contributing
- Fork the repository and open pull requests for improvements.
- Create branches per feature/fix and include tests where applicable.

License
Add a LICENSE file to the repo to declare usage rights (MIT is a common permissive choice). If not added, the project is not licensed for reuse.

Author
Sagar (CodeManBist) — Full Stack Developer
GitHub: https://github.com/CodeManBist
