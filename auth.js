import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"

const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

passport.use(
  new LocalStrategy((username, password, done) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return done(null, { username })
    }
    return done(null, false)
  })
)

passport.serializeUser((user, done) => {
  done(null, user.username)
})

passport.deserializeUser((username, done) => {
  if (username === ADMIN_USERNAME) {
    done(null, { username })
  } else {
    done(null, false)
  }
})

export default passport
