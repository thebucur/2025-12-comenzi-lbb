import { Router } from 'express'
import { uploadPhoto, uploadFoaieDeZahar, linkSessionToOrder, getPhotosBySessionId, markPhotosAsSent } from '../controllers/upload.controller'
import uploadMiddleware, { uploadAny } from '../middleware/upload.middleware'

const router = Router()

// Accept both single and multiple files, and tolerate any field name
router.post('/:sessionId', uploadAny, uploadPhoto)

// Endpoint for foaie de zahar upload (single file, no compression)
router.post('/:sessionId/foaie-de-zahar', uploadAny, uploadFoaieDeZahar)

// Endpoint to get photos by session ID
router.get('/:sessionId/photos', getPhotosBySessionId)

// Endpoint to mark photos as sent (ready to be displayed in main app)
router.post('/:sessionId/send', markPhotosAsSent)

// Endpoint to link session to order (called when order is created)
router.post('/:sessionId/link/:orderId', async (req, res) => {
  try {
    const { sessionId, orderId } = req.params
    await linkSessionToOrder(sessionId, orderId)
    res.json({ success: true })
  } catch (error) {
    console.error('Error linking session to order:', error)
    res.status(500).json({ error: 'Failed to link session to order' })
  }
})

export default router
