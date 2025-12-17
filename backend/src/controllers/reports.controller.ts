import { Request, Response } from 'express'
import prisma from '../lib/prisma'

export const getReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, location } = req.query

    const where: any = {}
    if (startDate || endDate) {
      where.pickupDate = {}
      if (startDate) where.pickupDate.gte = new Date(startDate as string)
      if (endDate) where.pickupDate.lte = new Date(endDate as string)
    }
    if (location) where.location = location

    const orders = await prisma.order.findMany({
      where,
    })

    // Generate statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.advance || 0), 0),
      byLocation: {} as Record<string, number>,
      byCakeType: {} as Record<string, number>,
      byDeliveryMethod: {} as Record<string, number>,
    }

    orders.forEach((order) => {
      // By location
      const loc = order.location || 'N/A'
      stats.byLocation[loc] = (stats.byLocation[loc] || 0) + 1

      // By cake type
      const cake = order.cakeType || 'N/A'
      stats.byCakeType[cake] = (stats.byCakeType[cake] || 0) + 1

      // By delivery method
      const delivery = order.deliveryMethod || 'N/A'
      stats.byDeliveryMethod[delivery] = (stats.byDeliveryMethod[delivery] || 0) + 1
    })

    res.json({ orders, statistics: stats })
  } catch (error) {
    console.error('Error generating reports:', error)
    res.status(500).json({ error: 'Failed to generate reports' })
  }
}

