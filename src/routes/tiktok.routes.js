import { Router } from 'express'
import { uploadVideo } from '../controllers/tiktok.controller.js'

const router = Router()

router.post('/upload', uploadVideo)

// {
//   "url": "https://www.tiktok.com/@.../video/... https://www.tiktok.com/@.../video/..."
// }

export default router