import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// Get all global configurations
export const getGlobalConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.globalConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
    res.json(configs)
  } catch (error) {
    console.error('Error fetching global configs:', error)
    res.status(500).json({ error: 'Failed to fetch global configurations' })
  }
}

// Create or update global configuration
export const upsertGlobalConfig = async (req: Request, res: Response) => {
  try {
    const { category, key, value } = req.body

    if (!category || !key || value === undefined) {
      return res.status(400).json({ error: 'Category, key, and value are required' })
    }

    const existing = await prisma.globalConfig.findUnique({
      where: {
        category_key: {
          category,
          key,
        },
      },
    })

    let config
    if (existing) {
      config = await prisma.globalConfig.update({
        where: { id: existing.id },
        data: { value },
      })
    } else {
      config = await prisma.globalConfig.create({
        data: {
          category,
          key,
          value,
        },
      })
    }

    res.json(config)
  } catch (error) {
    console.error('Error upserting global config:', error)
    res.status(500).json({ error: 'Failed to save global configuration' })
  }
}

// Delete global configuration
export const deleteGlobalConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.globalConfig.delete({
      where: { id },
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting global config:', error)
    res.status(500).json({ error: 'Failed to delete global configuration' })
  }
}

// Get installation-specific enabled configs
export const getInstallationConfigs = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.params
    const configs = await prisma.installationConfig.findMany({
      where: { installationId },
      include: {
        globalConfig: true,
      },
    })
    res.json(configs)
  } catch (error) {
    console.error('Error fetching installation configs:', error)
    res.status(500).json({ error: 'Failed to fetch installation configurations' })
  }
}

// Toggle installation config (enable/disable a global config for an installation)
export const toggleInstallationConfig = async (req: Request, res: Response) => {
  try {
    const { installationId, globalConfigId } = req.body

    if (!installationId || !globalConfigId) {
      return res.status(400).json({ error: 'Installation ID and Global Config ID are required' })
    }

    const existing = await prisma.installationConfig.findUnique({
      where: {
        installationId_globalConfigId: {
          installationId,
          globalConfigId,
        },
      },
    })

    if (existing) {
      // Toggle enabled status
      const config = await prisma.installationConfig.update({
        where: {
          installationId_globalConfigId: {
            installationId,
            globalConfigId,
          },
        },
        data: {
          enabled: !existing.enabled,
        },
      })
      res.json(config)
    } else {
      // Create new with enabled=true
      const config = await prisma.installationConfig.create({
        data: {
          installationId,
          globalConfigId,
          enabled: true,
        },
      })
      res.json(config)
    }
  } catch (error) {
    console.error('Error toggling installation config:', error)
    res.status(500).json({ error: 'Failed to toggle installation configuration' })
  }
}

// Add item to a global config
export const addItemToConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { item } = req.body

    if (!item) {
      return res.status(400).json({ error: 'Item is required' })
    }

    const config = await prisma.globalConfig.findUnique({
      where: { id },
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' })
    }

    const currentValue = Array.isArray(config.value) ? (config.value as any[]) : []
    if (currentValue.includes(item)) {
      return res.status(400).json({ error: 'Item already exists' })
    }

    const updatedValue = [...currentValue, item]
    const updated = await prisma.globalConfig.update({
      where: { id },
      data: { value: updatedValue },
    })

    res.json(updated)
  } catch (error) {
    console.error('Error adding item to config:', error)
    res.status(500).json({ error: 'Failed to add item to configuration' })
  }
}

// Delete item from a global config
export const deleteItemFromConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { item } = req.body

    if (!item) {
      return res.status(400).json({ error: 'Item is required' })
    }

    const config = await prisma.globalConfig.findUnique({
      where: { id },
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' })
    }

    const currentValue = Array.isArray(config.value) ? (config.value as any[]) : []
    const updatedValue = currentValue.filter((i) => i !== item)

    const updated = await prisma.globalConfig.update({
      where: { id },
      data: { value: updatedValue },
    })

    res.json(updated)
  } catch (error) {
    console.error('Error deleting item from config:', error)
    res.status(500).json({ error: 'Failed to delete item from configuration' })
  }
}

// Get config with installation status
export const getConfigWithInstallationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { installationId } = req.query

    const config = await prisma.globalConfig.findUnique({
      where: { id },
      include: {
        installations: installationId
          ? {
              where: { installationId: installationId as string },
            }
          : true,
      },
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' })
    }

    const isEnabled = installationId
      ? config.installations.some((ic) => ic.installationId === installationId && ic.enabled)
      : false

    res.json({
      ...config,
      isEnabled,
    })
  } catch (error) {
    console.error('Error fetching config with installation status:', error)
    res.status(500).json({ error: 'Failed to fetch configuration' })
  }
}

