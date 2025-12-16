import { Router } from 'express'
import { uploadPhoto, linkSessionToOrder, getPhotosBySessionId, markPhotosAsSent } from '../controllers/upload.controller'
import uploadMiddleware from '../middleware/upload.middleware'

const router = Router()

router.post('/:sessionId', uploadMiddleware.single('photo'), uploadPhoto)

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
