import { Router } from 'express'
import { login, getInstallationConfig } from '../controllers/auth.controller'

const router = Router()

router.post('/login', login)
router.get('/installation/:installationId/config', getInstallationConfig)

export default router




