import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { 
  getOrderDetails, 
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  downloadFoaieDeZahar,
  fixFoaieDeZaharFlags,
  listUploadsFiles,
  deleteAllOrders
} from '../controllers/admin.controller'

const router = Router()

// Protect all admin routes with authentication
router.use(authenticate)

// IMPORTANT: /orders/all must come BEFORE /orders/:id to avoid route conflict
router.delete('/orders/all', deleteAllOrders) // Temporary endpoint to delete all orders
router.get('/orders/:id', getOrderDetails)
router.get('/orders/:id/foaie-de-zahar', downloadFoaieDeZahar)
router.get('/uploads/files', listUploadsFiles)
router.post('/fix-foaie-de-zahar-flags', fixFoaieDeZaharFlags)
router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router

