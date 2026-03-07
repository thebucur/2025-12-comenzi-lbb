import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { 
  getTodayInventory,
  saveInventory,
  submitInventory,
  getInventoriesByDate,
  getInventoryById,
  getInventoryPDF,
  generateInventoryPDF,
  getUserInventories
} from '../controllers/inventory.controller'

const router = Router()

// Protect all inventory routes with authentication
router.use(authenticate)

// User routes
router.get('/today', getTodayInventory)
router.get('/my-inventories', getUserInventories)
router.post('/', saveInventory)
router.post('/submit', submitInventory)

// Admin routes
router.get('/admin/by-date', getInventoriesByDate)
router.post('/:id/generate-pdf', generateInventoryPDF)
router.get('/pdf/:id', getInventoryPDF)
router.get('/:id', getInventoryById)

export default router



