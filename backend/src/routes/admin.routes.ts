import { Router } from 'express'
import { 
  getOrderDetails, 
  listUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/admin.controller'

const router = Router()

router.get('/orders/:id', getOrderDetails)
router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router

