import fs from "fs"
import path from "path"
import ytDlp from "yt-dlp-exec"
import { config } from "../config/index.js"

function trimTrailingDotsAndSpaces(str) {
  return str.trim().replace(/[. ]+$/g, "")
}

function cutByWholeWord(str, maxLen) {
  const cleaned = trimTrailingDotsAndSpaces(str)
  if (cleaned.length <= maxLen) return cleaned

  const slice = cleaned.slice(0, maxLen).trim()
  const lastSpace = slice.lastIndexOf(" ")

  if (lastSpace >= 20) {
    return trimTrailingDotsAndSpaces(slice.slice(0, lastSpace))
  }

  return trimTrailingDotsAndSpaces(slice)
}

function optimizeFileName(input, maxLen = 180) {
  let fileName = String(input ?? "")
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/[^\p{L}\p{N}\s#._(),-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  fileName = trimTrailingDotsAndSpaces(fileName)

  if (!fileName) return "tiktok_video"
  if (fileName.length <= maxLen) return fileName

  const tailTagRe = /\s#\S+\s*$/u
  while (fileName.length > maxLen && tailTagRe.test(fileName)) {
    fileName = trimTrailingDotsAndSpaces(fileName.replace(tailTagRe, "").trim())
  }

  if (fileName.length > maxLen) {
    fileName = cutByWholeWord(fileName, maxLen)
  }

  return fileName || "tiktok_video"
}

function makeNonConflictingPath(dir, baseName, ext = ".mp4") {
  let finalPath = path.join(dir, `${baseName}${ext}`)
  if (!fs.existsSync(finalPath)) return finalPath

  let i = 1
  while (true) {
    finalPath = path.join(dir, `${baseName} (${i})${ext}`)
    if (!fs.existsSync(finalPath)) return finalPath
    i++
  }
}

export const downloadVideo = async (videoUrl) => {
  if (!videoUrl) throw new Error("TikTok URL is required")

  if (!fs.existsSync(config.downloadsDir)) {
    fs.mkdirSync(config.downloadsDir, { recursive: true })
  }

  const info = await ytDlp(videoUrl, {
    dumpSingleJson: true,
    skipDownload: true,
  })

  const titleRaw = info?.description?.trim() || "tiktok_video"
  const finalBaseName = optimizeFileName(titleRaw, 180)

  const tmpBase = `tmp_${info?.id || Date.now()}_${Math.random().toString(16).slice(2)}`
  const tmpPath = path.join(config.downloadsDir, `${tmpBase}.mp4`)

  await ytDlp(videoUrl, {
    output: tmpPath,
    mergeOutputFormat: "mp4",
  })

  if (!fs.existsSync(tmpPath)) {
    throw new Error("Downloaded file not found: " + tmpPath)
  }

  const finalPath = makeNonConflictingPath(config.downloadsDir, finalBaseName, ".mp4")

  try {
    fs.renameSync(tmpPath, finalPath)
  } catch (e) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch (_) {}

    throw new Error(
      `Failed to rename downloaded file to final name. Reason: ${e?.message || e}`
    )
  }

  return {
    filePath: finalPath,
    fileName: path.basename(finalPath),
    title: finalBaseName
  }
}
