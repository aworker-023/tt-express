import { uploadAll } from '../services/uploadAll.service.js'

export const uploadVideo = async (req, res) => {
  try {
    const { url, urls } = req.body

    let urlList = []

    if (Array.isArray(urls) && urls.length > 0) {
      urlList = urls
    } else if (typeof url === 'string') {
      urlList = url
        .split(/\s+/)
        .map((u) => u.trim())
        .filter(Boolean)
    }

    if (!urlList.length) {
      return res.status(400).json({
        error:
          'Field "url" (string, ссылки через пробел) или "urls" (array) is required',
      })
    }

    const result = await uploadAll(urlList)

    // пока такой вывод
    const textResult = result.results
      .map(item => {
        const links = item.uploads
          .map(u => u.url)
          .join("\n")

        return `${item.title}:\n${links}`
      })
      .join("\n\n")

    return res
      .set("Content-Type", "text/plain; charset=utf-8")
      .send(textResult)

    // return res.json({
    //   status: 'ok',
    //   ...result,
    // })
    
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
