import { Router } from 'express'
import { login, getGlobalConfig, seedAdmin } from '../controllers/auth.controller'

const router = Router()

router.post('/login', login)
router.get('/config', getGlobalConfig)
router.post('/seed-admin', seedAdmin) // Public endpoint to seed admin user

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working', timestamp: new Date().toISOString() })
})

export default router

















