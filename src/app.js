import express from 'express'
import session from 'express-session'
import tiktokRoutes from './routes/tiktok.routes.js'
import authRoutes from './routes/auth.routes.js'
import passport from '../auth.js'

const app = express()

app.use(express.json())

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
      httpOnly: true,
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

app.use('/auth', authRoutes)

function authGuard(req, res, next) {
  if (req.isAuthenticated()) return next()
  return res.status(401).json({ error: 'Not authorized' })
}

app.use('/api/tiktok', authGuard, tiktokRoutes)

export default app
