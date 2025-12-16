import { Router } from 'express'
import { login, getGlobalConfig } from '../controllers/auth.controller'

const router = Router()

router.post('/login', login)
router.get('/config', getGlobalConfig)

export default router













