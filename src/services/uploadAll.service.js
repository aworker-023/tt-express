import fs from 'node:fs'
import { config } from '../config/index.js'
import { downloadVideo } from './download.service.js'
import { createTikTokSession } from './browser.service.js'
import { uploadSingle } from './uploadSingle.service.js'

function resolveAccountsFromCookiesDir() {
  const cookiesDir = config.cookiesDir

  if (!fs.existsSync(cookiesDir)) {
    throw new Error(
      `Cookies dir not found: ${cookiesDir}. Put *.json cookies files there.`,
    )
  }

  const files = fs.readdirSync(cookiesDir, { withFileTypes: true })

  const jsonFiles = files
    .filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.json'))
    .map((f) => f.name)
    .sort()

  if (!jsonFiles.length) {
    throw new Error(
      `No *.json cookie files found in ${cookiesDir}. Add at least one cookies file.`,
    )
  }

  return jsonFiles.map((fileName) => fileName.replace(/\.json$/i, ''))
}

export async function uploadAll(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('At least one URL is required')
  }

  const videos = []
  for (const srcUrl of urls) {
    const downloaded = await downloadVideo(srcUrl)
    videos.push({
      sourceUrl: srcUrl,
      filePath: downloaded.filePath,
      title: downloaded.title || null,
    })
  }

  const allResults = videos.map((v) => ({
    sourceUrl: v.sourceUrl,
    title: v.title,
    uploads: [], // { account, url }
  }))

  const accounts = resolveAccountsFromCookiesDir()

  for (const accountName of accounts) {
    let browser
    try {
      let page
      ;({ browser, page } = await createTikTokSession(accountName, {
        headless: false, // можно будет сделать true
      }))

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i]

        try {
          const uploadedUrl = await uploadSingle(page, v.filePath)

          allResults[i].uploads.push({
            account: accountName,
            url: uploadedUrl,
          })
        } catch {
          allResults[i].uploads.push({
            account: accountName,
            url: null,
          })
        }
      }
    } catch {
      for (let i = 0; i < videos.length; i++) {
        allResults[i].uploads.push({
          account: accountName,
          url: null,
        })
      }
    } finally {
      if (browser) {
        try {
          await browser.close()
        } catch {}
      }
    }
  }

  return { results: allResults }
}
