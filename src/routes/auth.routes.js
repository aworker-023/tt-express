import { Router } from "express"
import passport from "passport"

const router = Router()

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) return next(err)

    if (!user) {
      return res.status(401).json({ error: "Неверный логин или пароль" })
    }

    req.login(user, err => {
      if (err) return next(err)
      return res.json({ success: true, user })
    })
  })(req, res, next)
})

router.post("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.json({ success: true })
  })
})

router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user })
  }
  res.status(401).json({ authenticated: false })
})

export default router
