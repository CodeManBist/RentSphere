if (process.env.NODE_ENV != "production") {
  require("dotenv").config()
}

const express = require("express")
const app = express()
const mongoose = require("mongoose")
const path = require("path")
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate")
const ExpressError = require("./utils/ExpressError")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const User = require("./Models/user")

const { attachSafeOwner } = require("./middleware");

const listingRouter = require("./routes/listing")
const reviewRouter = require("./routes/review")
const userRouter = require("./routes/user")
const bookingRouter = require("./routes/booking")
const paymentRouter = require("./routes/payment")
const adminRouter = require("./routes/admin")

// const MONGO_URL = 'mongodb://127.0.0.1:27017/StayHive';
const dbUrl = process.env.ATLASDB_URL

main()
  .then(() => {
    console.log("connected to mongoDB")
  })
  .catch((err) => {
    console.log(err)
  })

async function main() {
  await mongoose.connect(dbUrl)
}

app.set("trust proxy", 1);
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride("_method"))
app.engine("ejs", ejsMate)
app.use(express.static(path.join(__dirname, "/public")))

const store = MongoStore.create({
  mongoUrl: dbUrl,
  // crypto: {
  //   secret: process.env.SECRET,
  // },
  touchAfter: 24 * 3600,
})

store.on("error", (e) => {
  console.log("SESSION STORE ERROR", e)
})

const sessionOptions = {
  store,
  name: "rentsphere-session",
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};


app.use(attachSafeOwner);
app.use(session(sessionOptions))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {
  res.locals.success = req.flash("success")
  res.locals.error = req.flash("error")
  res.locals.currUser = req.user || null
  next()
})

app.use("/listings", listingRouter)
app.use("/listings/:id/reviews", reviewRouter)
app.use("/", userRouter)
app.use("/bookings", bookingRouter)
app.use("/payments", paymentRouter)
app.use("/admin", adminRouter)

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"))
})

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err
  // res.status(statusCode).send(message);
  res.status(statusCode).render("error.ejs", { message })
})

const port = 3000

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`)
})
