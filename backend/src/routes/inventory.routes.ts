import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { 
  getTodayInventory,
  saveInventory,
  submitInventory,
  getInventoriesByDate,
  getInventoryById,
  getInventoryPDF
} from '../controllers/inventory.controller'

const router = Router()

// Protect all inventory routes with authentication
router.use(authenticate)

// User routes
router.get('/today', getTodayInventory)
router.post('/', saveInventory)
router.post('/submit', submitInventory)

// Admin routes
router.get('/admin/by-date', getInventoriesByDate)
router.get('/:id', getInventoryById)
router.get('/pdf/:id', getInventoryPDF)

export default router



