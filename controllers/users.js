const User = require("../Models/user")

module.exports.renderSignupForm = (req, res) => {
  res.render("users/signup")
}

module.exports.renderLoginForm = (req, res) => {
  res.render("users/login")
}

module.exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body
    const newUser = new User({ email, username })
    const registeredUser = await User.register(newUser, password)
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err)
      }
      req.flash("success", "Welcome to StayHive!")
      res.redirect("/listings")
    })
  } catch (e) {
    req.flash("error", e.message)
    res.redirect("/signup")
  }
}

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to StayHive!")
  const redirectUrl = res.locals.redirectUrl || "/listings"
  res.redirect(redirectUrl)
}

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    req.flash("success", "You are logged out!")
    res.redirect("/listings")
  })
}
