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


// Helper function to check if items are equal (handles both strings and color objects)
const itemsEqual = (item1: any, item2: any): boolean => {
  if (item1 === item2) return true
  if (typeof item1 === 'object' && typeof item2 === 'object' && item1 !== null && item2 !== null) {
    // Both are objects - compare by name and value
    return item1.name === item2.name && item1.value === item2.value
  }
  if (typeof item1 === 'object' && item1 !== null && typeof item2 === 'string') {
    // item1 is object, item2 is string - compare object's name or value with string
    return item1.name === item2 || item1.value === item2
  }
  if (typeof item2 === 'object' && item2 !== null && typeof item1 === 'string') {
    // item2 is object, item1 is string - compare object's name or value with string
    return item2.name === item1 || item2.value === item1
  }
  return false
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
    
    // Check if item already exists (handles both string and object formats)
    const itemExists = currentValue.some((existingItem) => itemsEqual(existingItem, item))
    if (itemExists) {
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
    // Filter out items that match (handles both string and object formats)
    const updatedValue = currentValue.filter((i) => !itemsEqual(i, item))

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


