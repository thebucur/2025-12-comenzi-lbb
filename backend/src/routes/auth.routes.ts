import { Router } from 'express'
import { login, getGlobalConfig, seedAdmin } from '../controllers/auth.controller'

const router = Router()

router.post('/login', login)
router.get('/config', getGlobalConfig)
router.post('/seed-admin', seedAdmin) // Public endpoint to seed admin user

export default router













