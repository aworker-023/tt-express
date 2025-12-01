import fs from 'node:fs'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

async function humanSleep(secMin, secMax) {
  const ms = randomBetween(secMin * 1000, secMax * 1000)
  await sleep(ms)
}

async function clickButtonByText(page, substrings) {
  const handles = await page.$$('button, div[role="button"]')

  for (const handle of handles) {
    const text = (await page.evaluate((el) => el.innerText || '', handle))
      .trim()
      .toLowerCase()

    if (!text) continue

    for (const sub of substrings) {
      if (text.includes(sub.toLowerCase())) {
        await handle.click()
        return true
      }
    }
  }

  return false
}

async function handleContentCheckDialog(page) {
  await humanSleep(1.5, 3)

  await clickButtonByText(page, [
    'no thanks',
    'not now',
    'skip',
    'cancel',
    'нет, спасибо',
    'не сейчас',
  ])
}

async function clickPublishButton(page) {
  const okByText = await clickButtonByText(page, [
    'опубликовать',
    'опублікувати',
    'post',
    'publish',
  ])

  if (okByText) return true

  const selectors = [
    'button[data-e2e="post-button"]',
    'button[type="submit"]',
    'button[aria-label*="Post"]',
    'button[aria-label*="Опубликовать"]',
  ]

  for (const sel of selectors) {
    const btn = await page.$(sel)
    if (btn) {
      await btn.click()
      return true
    }
  }

  return false
}

async function getLastStudioVideoLink(page) {
  const studioUrl = 'https://www.tiktok.com/tiktokstudio/content'

  await page.goto(studioUrl, {
    waitUntil: 'networkidle2',
    timeout: 120000,
  })

  await humanSleep(6, 10)

  const lastLink = await page.$$eval('a[href*="/video/"]', (els) => {
    const hrefs = els
      .map((el) => el.href)
      .filter((href) => href && href.includes('/video/'))
      .map((href) => href.split('?')[0])

    return hrefs[0] || null
  })

  console.log('lastLink'+ lastLink)

  return lastLink
}

export async function uploadSingle(page, videoPath) {
  if (!fs.existsSync(videoPath)) {
    throw new Error('Video file not found: ' + videoPath)
  }

  const lastBefore = await getLastStudioVideoLink(page)

  console.log('lastBefore'+ lastBefore)

  await page.goto('https://www.tiktok.com/upload?lang=en', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  })

  // === CHECK 404 AFTER /upload ===
  const has404AfterUpload = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return text.includes('404') || text.toLowerCase().includes('page not found')
  })
  console.log('[uploadSingle] 404 after /upload =', has404AfterUpload)

  const fileInputSelector = 'input[type="file"]'
  await page.waitForSelector(fileInputSelector, { timeout: 60000 })

  const input = await page.$(fileInputSelector)
  await input.uploadFile(videoPath)

  await humanSleep(15, 25)

  await handleContentCheckDialog(page)

  const clicked = await clickPublishButton(page)
  if (!clicked) {
    return null
  }

  await humanSleep(12, 24)

  const lastAfter = await getLastStudioVideoLink(page)

  console.log('lastAfter'+ lastAfter)

  let uploadedUrl = null

  if (!lastBefore && lastAfter) {
    uploadedUrl = lastAfter
  } else if (lastAfter && lastAfter !== lastBefore) {
    uploadedUrl = lastAfter
  } else if (lastAfter) {
    uploadedUrl = lastAfter
  } else {
    uploadedUrl = null
  }

  if (uploadedUrl) {

    console.log('uploadedUrl'+ uploadedUrl)

    await page.goto(uploadedUrl, {
      waitUntil: 'networkidle2',
      timeout: 120000,
    })

    // === CHECK 404 AFTER OPEN VIDEO ===
    const has404OnVideo = await page.evaluate(() => {
      const text = document.body.innerText || ''
      return text.includes('404') || text.toLowerCase().includes('page not found')
    })
    console.log('[uploadSingle] 404 on uploaded video page =', has404OnVideo)

  }

  return uploadedUrl
}
