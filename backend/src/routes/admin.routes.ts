import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { 
  getOrderDetails, 
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStaffNames,
  updateUserStaffNames,
  downloadFoaieDeZahar,
  fixFoaieDeZaharFlags,
  listUploadsFiles,
  deleteOrders
} from '../controllers/admin.controller'

const router = Router()

// Protect all admin routes with authentication
router.use(authenticate)

router.get('/orders/:id', getOrderDetails)
router.get('/orders/:id/foaie-de-zahar', downloadFoaieDeZahar)
router.delete('/orders', deleteOrders)
router.get('/uploads/files', listUploadsFiles)
router.post('/fix-foaie-de-zahar-flags', fixFoaieDeZaharFlags)
router.get('/users', listUsers)
router.get('/users/:id/staff-names', getUserStaffNames)
router.put('/users/:id/staff-names', updateUserStaffNames)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router

