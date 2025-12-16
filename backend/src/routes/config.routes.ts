import { Router } from 'express'
import {
  getGlobalConfigs,
  upsertGlobalConfig,
  deleteGlobalConfig,
  addItemToConfig,
  deleteItemFromConfig,
} from '../controllers/config.controller'

const router = Router()

router.get('/global', getGlobalConfigs)
router.post('/global', upsertGlobalConfig)
router.put('/global/:id', upsertGlobalConfig)
router.delete('/global/:id', deleteGlobalConfig)
router.post('/global/:id/items', addItemToConfig)
router.post('/global/:id/items/delete', deleteItemFromConfig)

export default router

