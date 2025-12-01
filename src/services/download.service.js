import fs from 'fs'
import path from 'path'
import ytDlp from 'yt-dlp-exec'
import { config } from '../config/index.js'

function optimizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const downloadVideo = async (videoUrl) => {
  if (!videoUrl) throw new Error('TikTok URL is required')

  // гарантируем, что папка downloads существует
  if (!fs.existsSync(config.downloadsDir)) {
    fs.mkdirSync(config.downloadsDir, { recursive: true })
  }

  // получаем информацию о видео
  const info = await ytDlp(videoUrl, {
    dumpSingleJson: true,
    skipDownload: true,
  })

  const title = info?.description?.trim() || 'tiktok_video'
  const safeTitle = optimizeFileName(title)

  const fileName = `${safeTitle}.mp4`
  const outputPath = path.join(config.downloadsDir, fileName)

  // скачиваем само видео
  await ytDlp(videoUrl, {
    output: outputPath,
    format: 'mp4',
  })

  if (!fs.existsSync(outputPath)) {
    throw new Error('Downloaded file not found: ' + outputPath)
  }

  return {
    filePath: outputPath,
    fileName,
    title: safeTitle,
  }
}
