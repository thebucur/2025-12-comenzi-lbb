import { Router } from 'express'
import { 
  getOrderDetails, 
  listInstallations, 
  updateInstallation, 
  deleteInstallation,
  listUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/admin.controller'

const router = Router()

router.get('/orders/:id', getOrderDetails)
router.get('/installations', listInstallations)
router.put('/installations/:id', updateInstallation)
router.delete('/installations/:id', deleteInstallation)
router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router

