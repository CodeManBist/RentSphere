# 🏠 RentSphere — Smart Multi-Category Rental Website

RentSphere is a **full-stack multi-category rental platform** built with **Node.js, Express, MongoDB, and EJS** that helps users explore, compare, and rent properties with advanced filters, reviews, and dynamic pricing features.

Unlike normal rental websites, RentSphere includes a **Smart Chatbot Assistant** and **Season-Based Pricing Filters** to provide a real-world rental experience.

---

## 🚀 Live Demo
🔗 https://project1-2tfo.onrender.com/listings

---

## ✨ Core Features

### 🏘️ Multi-Category Rentals
✅ Explore multiple rental categories from a single platform  
✅ Category-wise listing pages  
✅ Detailed listing view with complete property information  

---

### 🔍 Advanced Search & Filters
✅ Search rentals by name / location / category  
✅ Filter by:
- Price range  
- Category type  
- Ratings  
- Availability  
✅ Sort options (Newest / Price Low → High / Popular)

---

### 🌦️ Season-Based Pricing System
✅ Rentals support **Seasonal Pricing** (Summer / Winter / Festival / Peak Season etc.)  
✅ Filter listings based on season pricing  
✅ Helps users find best deals depending on time/season

---

### ⭐ Review & Rating System
✅ Users can add reviews on listings  
✅ Star rating support  
✅ Reviews are displayed on listing details page  
✅ Improves trust & listing credibility

---

### 🤖 Smart Chatbot Assistant
✅ Built-in chatbot to assist users inside the platform  
✅ Helps users with:
- Finding rentals
- Choosing categories
- Understanding price & seasonal offers
- Quick support-style answers

---

### 🧩 Full CRUD Rental Management
✅ Add new rental listing  
✅ Edit/update listing information  
✅ Delete listings  
✅ Upload and manage listing images  

---

### 🖼️ Image Upload Support
✅ Image upload and storage integration  
✅ Cloud configuration ready (Cloudinary integration supported)

---

### 🏗️ Scalable Backend Architecture
✅ MVC Architecture (Models → Controllers → Routes)  
✅ Organized code structure for maintainability  
✅ Middleware support for validation and clean request handling  
✅ Proper error handling and user-friendly responses

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js  
- **Frontend:** EJS (Server Side Rendering)  
- **Database:** MongoDB + Mongoose  
- **Cloud / Image Storage:** Cloudinary (via cloud config)  
- **Styling:** CSS + EJS templates  
- **Architecture:** MVC pattern  

---

## 📂 Project Structure
```bash
RentSphere/
│── Models/            # Mongoose models (Listings, Reviews, Users, etc.)
│── controllers/       # Business logic for rentals, reviews, chatbot, filters
│── routes/            # Express route definitions
│── views/             # EJS pages (Home, Listings, Details, Forms, etc.)
│── public/            # Static assets (CSS, JS, Images)
│── utils/             # Helper functions / utilities
│── init/              # Database seeding / setup helpers (if present)
│── middleware.js      # Custom middleware for validation/auth/handling
│── cloudConfig.js     # Cloudinary / image config
│── schema.js          # Schema validation / rules
│── app.js             # Main server file
│── package.json


⚙️ Installation & Setup
1️⃣ Clone the repo
git clone https://github.com/CodeManBist/RentSphere.git
cd RentSphere

2️⃣ Install dependencies
npm install

3️⃣ Setup environment variables

Create a .env file:

PORT=3000
MONGO_URI=your_mongodb_connection_string

# Cloudinary (if enabled)
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

4️⃣ Start the server
node app.js

or (recommended)

nodemon app.js

🔥 Future Enhancements

✨ User authentication (Login/Register)
✨ Wishlist / Save listing
✨ Booking system + rental request
✨ Payment gateway integration
✨ Admin panel for managing rentals & reviews
✨ Google Maps integration for locations

👨‍💻 Author

Sagar (CodeManBist)
Full Stack Developer | MERN | Node.js | Express | MongoDB
🔗 GitHub: https://github.com/CodeManBist
