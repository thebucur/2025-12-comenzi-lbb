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


