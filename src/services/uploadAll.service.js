import fs from 'node:fs'
import path from 'node:path'
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

// чистим папку загрузок ПЕРЕД новой задачей
async function cleanDownloadsDir() {
  const downloadsDir = config.downloadsDir   // используем тот же путь, что и в download.service

  try {
    await fs.promises.mkdir(downloadsDir, { recursive: true })

    const entries = await fs.promises.readdir(downloadsDir, {
      withFileTypes: true,
    })

    for (const entry of entries) {
      if (!entry.isFile()) continue

      const fullPath = path.join(downloadsDir, entry.name)

      try {
        await fs.promises.unlink(fullPath)
      } catch (e) {
        console.error('[cleanDownloadsDir] failed to delete:', fullPath, e.message)
      }
    }
  } catch (e) {
    console.error('[cleanDownloadsDir] error:', e.message)
  }
}

export async function uploadAll(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('At least one URL is required')
  }

  // чистим старые файлы перед новой задачей
  await cleanDownloadsDir()

  // 1) скачиваем все видео
  const videos = []
  for (const srcUrl of urls) {
    const downloaded = await downloadVideo(srcUrl)
    videos.push({
      sourceUrl: srcUrl,
      filePath: downloaded.filePath,
      title: downloaded.title || null,
    })
  }

  // 2) структура результатов по видео
  const allResults = videos.map((v) => ({
    sourceUrl: v.sourceUrl,
    title: v.title,
    uploads: [], // { account, url }
  }))

  // 3) аккаунты — все .json из cookiesDir
  const accounts = resolveAccountsFromCookiesDir()

  console.log('Started uploading videos')

  // 4) для каждого аккаунта — одна сессия, все видео по очереди
  for (const [index, accountName] of accounts.entries()) {

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

          console.log({
            account: `${index + 1} / ${accounts.length}`,
            video: `${i + 1} / ${videos.length}`
          })

        } catch {
          allResults[i].uploads.push({
            account: accountName,
            url: null,
          })
        }
      }
    } catch {
      // если сессия для аккаунта не создалась — null для всех видео
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

  console.log('Completed uploading videos')

  return { results: allResults }
}
