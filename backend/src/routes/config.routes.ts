import { Router } from 'express'
import {
  getGlobalConfigs,
  upsertGlobalConfig,
  deleteGlobalConfig,
  getInstallationConfigs,
  toggleInstallationConfig,
  addItemToConfig,
  deleteItemFromConfig,
  getConfigWithInstallationStatus,
} from '../controllers/config.controller'

const router = Router()

router.get('/global', getGlobalConfigs)
router.post('/global', upsertGlobalConfig)
router.put('/global/:id', upsertGlobalConfig)
router.delete('/global/:id', deleteGlobalConfig)
router.get('/global/:id', getConfigWithInstallationStatus)
router.post('/global/:id/items', addItemToConfig)
router.post('/global/:id/items/delete', deleteItemFromConfig)
router.get('/installation/:installationId', getInstallationConfigs)
router.post('/installation/toggle', toggleInstallationConfig)

export default router

