import { Request, Response } from 'express'
import prisma from '../lib/prisma'

function parseWeight(weight: string | null, customWeight: string | null): number {
  if (weight) {
    const rangeMatch = weight.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*kg/i)
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1].replace(',', '.'))
      const high = parseFloat(rangeMatch[2].replace(',', '.'))
      return (low + high) / 2
    }
    const singleMatch = weight.match(/(\d+(?:[.,]\d+)?)\s*kg/i)
    if (singleMatch) {
      return parseFloat(singleMatch[1].replace(',', '.'))
    }
  }
  if (customWeight) {
    const numMatch = customWeight.match(/(\d+(?:[.,]\d+)?)/)
    if (numMatch) return parseFloat(numMatch[1].replace(',', '.'))
  }
  return 0
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export const getReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        photos: { select: { isFoaieDeZahar: true } },
        cakes: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    })

    let totalWeight = 0
    let totalFoiDeZahar = 0
    let totalAdvance = 0

    const byCofetarie: Record<string, {
      orders: number
      weight: number
      foiDeZahar: number
      advance: number
    }> = {}

    const bySortiment: Record<string, { orders: number; weight: number }> = {}
    const byWeight: Record<string, number> = {}
    const byDeliveryMethod: Record<string, number> = {}
    const byShape: Record<string, number> = {}
    const byCoating: Record<string, number> = {}

    const dailyMap: Record<string, { total: number; byCofetarie: Record<string, number> }> = {}

    for (const order of orders) {
      const cakes = order.cakes || []
      const orderWeight = cakes.reduce((sum, c) => sum + parseWeight(c.weight, c.customWeight), 0)
      const foiCount = order.photos.filter(p => p.isFoaieDeZahar).length
      const adv = order.advance || 0

      totalWeight += orderWeight
      totalFoiDeZahar += foiCount
      totalAdvance += adv

      const cofetarie = order.createdByUsername || 'Necunoscut'
      if (!byCofetarie[cofetarie]) {
        byCofetarie[cofetarie] = { orders: 0, weight: 0, foiDeZahar: 0, advance: 0 }
      }
      byCofetarie[cofetarie].orders++
      byCofetarie[cofetarie].weight += orderWeight
      byCofetarie[cofetarie].foiDeZahar += foiCount
      byCofetarie[cofetarie].advance += adv

      for (const cake of cakes) {
        const cw = parseWeight(cake.weight, cake.customWeight)
        const sortiment = cake.cakeType || 'Nespecificat'
        if (!bySortiment[sortiment]) bySortiment[sortiment] = { orders: 0, weight: 0 }
        bySortiment[sortiment].orders++
        bySortiment[sortiment].weight += cw

        const weightLabel = cake.weight || cake.customWeight || 'Nespecificat'
        byWeight[weightLabel] = (byWeight[weightLabel] || 0) + 1

        if (cake.shape) {
          byShape[cake.shape] = (byShape[cake.shape] || 0) + 1
        }
      }

      const delivery = order.deliveryMethod || 'N/A'
      byDeliveryMethod[delivery] = (byDeliveryMethod[delivery] || 0) + 1

      if (order.coating) {
        byCoating[order.coating] = (byCoating[order.coating] || 0) + 1
      }

      const dayKey = toDateKey(order.createdAt)
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { total: 0, byCofetarie: {} }
      dailyMap[dayKey].total++
      dailyMap[dayKey].byCofetarie[cofetarie] = (dailyMap[dayKey].byCofetarie[cofetarie] || 0) + 1
    }

    const allCofetarii = Object.keys(byCofetarie)
    const dailyEvolution = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const entry: Record<string, any> = { date, total: data.total }
        for (const c of allCofetarii) {
          entry[c] = data.byCofetarie[c] || 0
        }
        return entry
      })

    res.json({
      kpis: {
        totalOrders: orders.length,
        totalAdvance: Math.round(totalAdvance * 100) / 100,
        totalWeight: Math.round(totalWeight * 100) / 100,
        totalFoiDeZahar,
      },
      byCofetarie,
      bySortiment,
      byWeight,
      byDeliveryMethod,
      byShape,
      byCoating,
      dailyEvolution,
      cofetarii: allCofetarii,
    })
  } catch (error) {
    console.error('Error generating reports:', error)
    res.status(500).json({ error: 'Failed to generate reports' })
  }
}
