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
      stats.byCakeType[order.cakeType] = (stats.byCakeType[order.cakeType] || 0) + 1

      // By delivery method
      stats.byDeliveryMethod[order.deliveryMethod] =
        (stats.byDeliveryMethod[order.deliveryMethod] || 0) + 1
    })

    res.json({ orders, statistics: stats })
  } catch (error) {
    console.error('Error generating reports:', error)
    res.status(500).json({ error: 'Failed to generate reports' })
  }
}

