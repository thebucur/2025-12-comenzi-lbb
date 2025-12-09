import { Router } from 'express'
import { uploadPhoto, linkSessionToOrder } from '../controllers/upload.controller'
import uploadMiddleware from '../middleware/upload.middleware'

const router = Router()

router.post('/:sessionId', uploadMiddleware.single('photo'), uploadPhoto)

// Endpoint to link session to order (called when order is created)
router.post('/:sessionId/link/:orderId', (req, res) => {
  const { sessionId, orderId } = req.params
  linkSessionToOrder(sessionId, orderId)
  res.json({ success: true })
})

export default router
