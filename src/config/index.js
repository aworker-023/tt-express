import 'dotenv/config'

export const config = {
  port: process.env.PORT || 3000,
  cookiesDir: 'src/cookies',
  downloadsDir: 'src/downloads',
}
