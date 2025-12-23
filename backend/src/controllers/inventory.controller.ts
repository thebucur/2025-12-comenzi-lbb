import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { generateInventoryPDF } from '../services/pdf.service'
import path from 'path'
import fs from 'fs'

// Helper function to normalize date to start of day (removes time component)
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

// Get user's inventory for today
export const getTodayInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const today = normalizeDate(new Date())

    const inventory = await prisma.inventory.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        entries: true,
      },
    })

    res.json({ inventory })
  } catch (error) {
    console.error('Error fetching today inventory:', error)
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
}

// Create or update inventory for today
export const saveInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const username = req.user?.username
    
    if (!userId || !username) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { entries } = req.body

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Invalid inventory data' })
    }

    const today = normalizeDate(new Date())

    // Check if inventory already exists for today
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    let inventory

    if (existingInventory) {
      // Update existing inventory
      // Delete old entries
      await prisma.inventoryEntry.deleteMany({
        where: { inventoryId: existingInventory.id },
      })

      // Create new entries
      const inventoryEntries = entries.map((entry: any) => ({
        category: entry.category,
        productName: entry.productName,
        isCustomProduct: entry.isCustomProduct || false,
        entries: entry.entries,
      }))

      await prisma.inventoryEntry.createMany({
        data: inventoryEntries.map((entry: any) => ({
          ...entry,
          inventoryId: existingInventory.id,
        })),
      })

      // Fetch updated inventory
      inventory = await prisma.inventory.findUnique({
        where: { id: existingInventory.id },
        include: { entries: true },
      })
    } else {
      // Create new inventory
      inventory = await prisma.inventory.create({
        data: {
          userId,
          username,
          date: today,
          entries: {
            create: entries.map((entry: any) => ({
              category: entry.category,
              productName: entry.productName,
              isCustomProduct: entry.isCustomProduct || false,
              entries: entry.entries,
            })),
          },
        },
        include: {
          entries: true,
        },
      })
    }

    res.json({ inventory, isUpdate: !!existingInventory })
  } catch (error) {
    console.error('Error saving inventory:', error)
    res.status(500).json({ error: 'Failed to save inventory' })
  }
}

// Submit and generate PDF
export const submitInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const username = req.user?.username
    
    if (!userId || !username) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { entries } = req.body

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Invalid inventory data' })
    }

    const today = normalizeDate(new Date())

    // Save or update inventory first
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    let inventory

    if (existingInventory) {
      // Delete old entries
      await prisma.inventoryEntry.deleteMany({
        where: { inventoryId: existingInventory.id },
      })

      // Create new entries
      await prisma.inventoryEntry.createMany({
        data: entries.map((entry: any) => ({
          category: entry.category,
          productName: entry.productName,
          isCustomProduct: entry.isCustomProduct || false,
          entries: entry.entries,
          inventoryId: existingInventory.id,
        })),
      })

      // Version will be incremented automatically by PDF service if generation code changed
      inventory = await prisma.inventory.findUnique({
        where: { id: existingInventory.id },
        include: { entries: true },
      })
    } else {
      // Create new inventory
      inventory = await prisma.inventory.create({
        data: {
          userId,
          username,
          date: today,
          entries: {
            create: entries.map((entry: any) => ({
              category: entry.category,
              productName: entry.productName,
              isCustomProduct: entry.isCustomProduct || false,
              entries: entry.entries,
            })),
          },
        },
        include: {
          entries: true,
        },
      })
    }

    if (!inventory) {
      return res.status(500).json({ error: 'Failed to create/update inventory' })
    }

    // Generate PDF
    const pdfPath = await generateInventoryPDF(inventory)

    // Update inventory with PDF path
    await prisma.inventory.update({
      where: { id: inventory.id },
      data: { pdfPath },
    })

    res.json({ 
      success: true, 
      inventory: { ...inventory, pdfPath },
      pdfPath,
      isUpdate: !!existingInventory 
    })
  } catch (error) {
    console.error('Error submitting inventory:', error)
    res.status(500).json({ error: 'Failed to submit inventory' })
  }
}

// Admin: Get all inventories grouped by date
export const getInventoriesByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' })
    }

    const targetDate = normalizeDate(new Date(date as string))

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
      },
    })

    // Get inventories for the target date
    const inventories = await prisma.inventory.findMany({
      where: {
        date: targetDate,
      },
      include: {
        entries: true,
      },
    })

    // Map users to their inventories
    const result = users.map((user) => {
      const inventory = inventories.find((inv) => inv.userId === user.id)
      return {
        userId: user.id,
        username: user.username,
        hasSubmitted: !!inventory,
        inventory: inventory || null,
      }
    })

    res.json({ date: targetDate, users: result })
  } catch (error) {
    console.error('Error fetching inventories by date:', error)
    res.status(500).json({ error: 'Failed to fetch inventories' })
  }
}

// Get inventory by ID (admin)
export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        entries: true,
      },
    })

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' })
    }

    res.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory by ID:', error)
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
}

// Get inventory PDF
export const getInventoryPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const inventory = await prisma.inventory.findUnique({
      where: { id },
    })

    if (!inventory || !inventory.pdfPath) {
      return res.status(404).json({ error: 'PDF not found' })
    }

    const pdfFullPath = path.resolve(inventory.pdfPath)

    if (!fs.existsSync(pdfFullPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk' })
    }

    const downloadName = path.basename(pdfFullPath)
    res.setHeader('Content-Type', 'application/pdf')
    // Use attachment so the browser gets the exact filename (including incremental suffix)
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`)
    res.sendFile(pdfFullPath)
  } catch (error) {
    console.error('Error fetching inventory PDF:', error)
    res.status(500).json({ error: 'Failed to fetch PDF' })
  }
}



