import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { linkSessionToOrder } from './upload.controller'

export const createOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body
    
    // Log incoming data for debugging - v1.2 (noCake support + type)
    console.log('Received order data:', JSON.stringify(orderData, null, 2))
    console.log('noCake value/type:', orderData.noCake, typeof orderData.noCake)

    // Validate required fields
    const baseRequiredFields = [
      'deliveryMethod',
      'staffName',
      'clientName',
      'phoneNumber',
      'pickupDate',
    ]

    // Check if noCake is true
    const isNoCake = orderData.noCake === true || orderData.noCake === 'true' || orderData.noCake === 1 || orderData.noCake === '1'
    console.log('Order noCake status:', isNoCake, 'Raw value:', orderData.noCake)

    // Add cake-specific required fields only if noCake is false
    const requiredFields = isNoCake
      ? [...baseRequiredFields, 'otherProducts'] // If no cake, otherProducts is required
      : [...baseRequiredFields, 'cakeType', 'weight', 'coating', 'decorType'] // If has cake, validate cake fields

    console.log('Required fields for this order:', requiredFields)

    const missingFields = requiredFields.filter((field) => {
      const value = orderData[field]
      return value === null || value === undefined || value === ''
    })

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      console.error('Order data received:', JSON.stringify(orderData, null, 2))
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields,
        message: `Lipsesc câmpuri obligatorii: ${missingFields.join(', ')}`,
      })
    }

    // Validate colors is an array
    if (orderData.colors && !Array.isArray(orderData.colors)) {
      console.error('Invalid colors field:', orderData.colors)
      return res.status(400).json({
        error: 'Invalid colors field',
        message: 'Câmpul "colors" trebuie să fie un array.',
      })
    }

    // Validate pickupDate is a valid date
    if (!orderData.pickupDate) {
      console.error('Missing pickupDate')
      return res.status(400).json({
        error: 'Missing pickupDate',
        message: 'Data ridicării este obligatorie.',
      })
    }

    const pickupDateObj = new Date(orderData.pickupDate)
    if (isNaN(pickupDateObj.getTime())) {
      console.error('Invalid pickupDate:', orderData.pickupDate)
      return res.status(400).json({
        error: 'Invalid pickupDate',
        message: 'Data ridicării este invalidă.',
      })
    }

    // Atomically reserve the next order number in a transaction to avoid duplicates
    console.log('Reserving next order number...')
    const { orderNumber, orderCreateData, orderId } = await prisma.$transaction(async (tx) => {
      // Ensure we have a single canonical counter row and sync it with existing orders
      let nextOrderNumber: number

      const [existingCounter, orderMax] = await Promise.all([
        tx.orderCounter.findUnique({ where: { id: 'global-counter' } }),
        tx.order.aggregate({ _max: { orderNumber: true } }),
      ])

      const highestOrderNumber = orderMax._max.orderNumber ?? 0

      if (existingCounter) {
        const base = Math.max(existingCounter.lastOrder, highestOrderNumber)
        const updated = await tx.orderCounter.update({
          where: { id: 'global-counter' },
          data: { lastOrder: base + 1 },
        })
        nextOrderNumber = updated.lastOrder
      } else {
        // If the canonical row is missing, initialize it using the max of existing counters or orders
        const counterMax = await tx.orderCounter.aggregate({ _max: { lastOrder: true } })
        const lastUsed = Math.max(
          counterMax._max.lastOrder ?? 0,
          highestOrderNumber,
        )

        const created = await tx.orderCounter.create({
          data: { id: 'global-counter', lastOrder: lastUsed + 1 },
        })
        nextOrderNumber = created.lastOrder
      }

      console.log(`Reserved order number: ${nextOrderNumber}`)

      // Prepare order data for creation
      const preparedData = {
        orderNumber: nextOrderNumber,
        deliveryMethod: String(orderData.deliveryMethod),
        location: orderData.location ? String(orderData.location) : null,
        address: orderData.address ? String(orderData.address) : null,
        staffName: String(orderData.staffName),
        clientName: String(orderData.clientName).trim(),
        phoneNumber: String(orderData.phoneNumber).trim(),
        pickupDate: pickupDateObj,
        tomorrowVerification: Boolean(orderData.tomorrowVerification),
        advance: orderData.advance ? parseFloat(orderData.advance.toString()) : null,
        noCake: Boolean(orderData.noCake),
        cakeType: orderData.cakeType ? String(orderData.cakeType) : null,
        weight: orderData.weight ? String(orderData.weight) : null,
        customWeight: orderData.customWeight ? String(orderData.customWeight) : null,
        shape: orderData.shape ? String(orderData.shape) : null,
        floors: orderData.floors ? String(orderData.floors) : null,
        otherProducts: orderData.otherProducts ? String(orderData.otherProducts) : null,
        coating: orderData.coating ? String(orderData.coating) : null,
        colors: Array.isArray(orderData.colors) ? orderData.colors.map((c: unknown) => String(c)) : [],
        decorType: orderData.decorType ? String(orderData.decorType) : null,
        decorDetails: orderData.decorDetails ? String(orderData.decorDetails) : null,
        observations: orderData.observations ? String(orderData.observations) : null,
        createdByUsername: orderData.createdByUsername ? String(orderData.createdByUsername) : null,
      }

      // Create order inside the same transaction so the reserved number is consumed exactly once
      const createdOrder = await tx.order.create({
        data: preparedData,
        include: { photos: true },
      })

      return { 
        orderNumber: createdOrder.orderNumber, 
        orderCreateData: preparedData,
        orderId: createdOrder.id,
      }
    })
    
    console.log('Creating order with data:', JSON.stringify(orderCreateData, null, 2))

    console.log('Order created successfully with number:', orderNumber)

    // Link any pending photo uploads to this order
    if (orderData.uploadSessionId) {
      try {
        console.log('Linking photos from session:', orderData.uploadSessionId)
        await linkSessionToOrder(orderData.uploadSessionId, orderId)
        console.log('Photos linked successfully')
      } catch (linkError) {
        console.error('Error linking photos to order:', linkError)
        // Don't fail the order creation if photo linking fails
      }
    }

    // Fetch order with photos to return complete data
    console.log('Fetching order with photos...')
    const orderWithPhotos = await prisma.order.findUnique({
      where: { orderNumber },
      include: { photos: true },
    })

    console.log('Order created successfully:', orderNumber)
    res.status(201).json({ ...orderWithPhotos, orderNumber })
  } catch (error: any) {
    console.error('Error creating order:', error)
    console.error('Error stack:', error.stack)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    
    // Handle Prisma validation errors
    if (error.code === 'P2002') {
      console.error('Duplicate order number error')
      return res.status(409).json({
        error: 'Duplicate order number',
        message: 'Numărul comenzii există deja. Vă rugăm să reîncercați.',
      })
    }

    if (error.code === 'P2003') {
      console.error('Invalid foreign key error')
      return res.status(400).json({
        error: 'Invalid foreign key',
        message: 'Date invalide: referință la înregistrare inexistentă.',
      })
    }

    if (error.code === 'P2011') {
      console.error('Null constraint violation')
      return res.status(400).json({
        error: 'Null constraint violation',
        message: 'Lipsesc câmpuri obligatorii.',
      })
    }

    if (error.code === 'P2012') {
      console.error('Missing required value')
      return res.status(400).json({
        error: 'Missing required value',
        message: `Lipsește o valoare obligatorie: ${error.meta?.target?.join(', ') || 'necunoscut'}`,
      })
    }

    // Handle database connection errors
    if (error.code === 'P1001' || error.message?.includes('connect')) {
      console.error('Database connection error')
      return res.status(503).json({
        error: 'Database connection error',
        message: 'Nu s-a putut conecta la baza de date. Vă rugăm să verificați conexiunea.',
      })
    }

    // Return more detailed error message
    const errorMessage = error.message || 'Failed to create order'
    console.error('Returning error response:', errorMessage)
    res.status(500).json({
      error: 'Failed to create order',
      message: errorMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        meta: error.meta,
      } : undefined,
    })
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
      include: { 
        photos: true,
        pickedUpBy: {
          select: {
            id: true,
            username: true,
          },
        },
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
    // Get the singleton counter without incrementing; if missing, initialize using existing data
    const [counter, orderMax, counterMax] = await Promise.all([
      prisma.orderCounter.findUnique({ where: { id: 'global-counter' } }),
      prisma.order.aggregate({ _max: { orderNumber: true } }),
      prisma.orderCounter.aggregate({ _max: { lastOrder: true } }),
    ])

    const highestUsed = Math.max(
      orderMax._max.orderNumber ?? 0,
      counter?.lastOrder ?? 0,
      counterMax._max.lastOrder ?? 0,
    )

    let ensuredCounter = counter
    if (!ensuredCounter) {
      ensuredCounter = await prisma.orderCounter.create({
        data: { id: 'global-counter', lastOrder: highestUsed },
      })
    } else if (ensuredCounter.lastOrder < highestUsed) {
      ensuredCounter = await prisma.orderCounter.update({
        where: { id: 'global-counter' },
        data: { lastOrder: highestUsed },
      })
    }

    // Return next order number without incrementing
    const nextOrderNumber = ensuredCounter.lastOrder + 1
    res.json({ nextOrderNumber })
  } catch (error) {
    console.error('Error getting next order number:', error)
    res.status(500).json({ error: 'Failed to get next order number' })
  }
}


