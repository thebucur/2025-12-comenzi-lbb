import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { linkSessionToOrder } from './upload.controller'

export const createOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body

    // Get or create order counter for centralized numbering
    let counter = await prisma.orderCounter.findFirst()
    if (!counter) {
      counter = await prisma.orderCounter.create({
        data: { lastOrder: 0 },
      })
    }

    // Increment order number
    const orderNumber = counter.lastOrder + 1
    await prisma.orderCounter.update({
      where: { id: counter.id },
      data: { lastOrder: orderNumber },
    })

    // Get default installation (or use installationId from request)
    const installationId = orderData.installationId || (await getDefaultInstallation())

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        installationId,
        deliveryMethod: orderData.deliveryMethod,
        location: orderData.location,
        address: orderData.address,
        staffName: orderData.staffName,
        clientName: orderData.clientName,
        phoneNumber: orderData.phoneNumber,
        pickupDate: new Date(orderData.pickupDate),
        tomorrowVerification: orderData.tomorrowVerification || false,
        advance: orderData.advance,
        cakeType: orderData.cakeType,
        weight: orderData.weight,
        customWeight: orderData.customWeight,
        shape: orderData.shape,
        floors: orderData.floors,
        otherProducts: orderData.otherProducts,
        coating: orderData.coating,
        colors: orderData.colors || [],
        decorType: orderData.decorType,
        decorDetails: orderData.decorDetails,
        observations: orderData.observations,
      },
      include: { photos: true },
    })

    // Link any pending photo uploads to this order
    if (orderData.uploadSessionId) {
      linkSessionToOrder(orderData.uploadSessionId, order.id)
    }

    res.status(201).json({ ...order, orderNumber })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
}

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id },
      include: { photos: true },
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
}

export const listOrders = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, location, installationId } = req.query

    const where: any = {}
    if (startDate || endDate) {
      where.pickupDate = {}
      if (startDate) where.pickupDate.gte = new Date(startDate as string)
      if (endDate) where.pickupDate.lte = new Date(endDate as string)
    }
    if (location) where.location = location
    if (installationId) where.installationId = installationId as string

    const orders = await prisma.order.findMany({
      where,
      include: { 
        photos: true,
        installation: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(orders)
  } catch (error) {
    console.error('Error listing orders:', error)
    res.status(500).json({ error: 'Failed to list orders' })
  }
}

export const getNextOrderNumber = async (req: Request, res: Response) => {
  try {
    // Get or create order counter for centralized numbering
    let counter = await prisma.orderCounter.findFirst()
    if (!counter) {
      counter = await prisma.orderCounter.create({
        data: { lastOrder: 0 },
      })
    }

    // Return next order number without incrementing
    const nextOrderNumber = counter.lastOrder + 1
    res.json({ nextOrderNumber })
  } catch (error) {
    console.error('Error getting next order number:', error)
    res.status(500).json({ error: 'Failed to get next order number' })
  }
}

const getDefaultInstallation = async () => {
  let installation = await prisma.installation.findFirst()
  if (!installation) {
    installation = await prisma.installation.create({
      data: {
        name: 'Default Installation',
      },
    })
  }
  return installation.id
}

