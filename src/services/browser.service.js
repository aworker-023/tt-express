import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { config } from '../config/index.js'

export async function createTikTokSession(accountName, options = {}) {
  const { headless = false } = options

  if (!accountName) {
    throw new Error('accountName is required for createTikTokSession')
  }

  const cookiesPath = path.join(config.cookiesDir, `${accountName}.json`)

  if (!fs.existsSync(cookiesPath)) {
    throw new Error('Cookies file not found: ' + cookiesPath)
  }

  const rawCookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'))

  if (!Array.isArray(rawCookies) || rawCookies.length === 0) {
    throw new Error(
      'Cookies file is empty or has invalid format: ' + cookiesPath
    )
  }

  const browser = await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
    ],
    defaultViewport: null,
  })

  const page = await browser.newPage()

  const cookiesForPuppeteer = rawCookies.map((c) => {
    const cookie = {
      name: c.name,
      value: c.value,
      domain: c.domain || '.tiktok.com',
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
    }

    if (c.expires) {
      cookie.expires = typeof c.expires === 'number' ? c.expires : undefined
    } else if (typeof c.expirationDate === 'number') {
      cookie.expires = Math.floor(c.expirationDate)
    }

    if (c.sameSite) {
      cookie.sameSite = c.sameSite
    }

    return cookie
  })

  await page.setCookie(...cookiesForPuppeteer)

  await page.goto('https://www.tiktok.com', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  })

  const loginField = await page.$(
    'input[name="username"], input[name="email"], input[name="password"]'
  )

  if (loginField) {
    await browser.close()
    throw new Error(
      'TikTok requires login – cookies are invalid or expired: ' + cookiesPath
    )
  }

  return { browser, page }
}
