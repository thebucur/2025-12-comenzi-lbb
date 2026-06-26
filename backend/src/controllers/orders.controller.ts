import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { linkSessionToOrder } from './upload.controller'
import type { AuthRequest } from '../middleware/auth.middleware'
import { getBucharestTodayString } from '../utils/date'
import { normalizePhoneDigits } from '../utils/phone'

interface IncomingCake {
  cakeType?: string | null
  weight?: string | null
  customWeight?: string | null
  shape?: string | null
  floors?: string | null
  position?: number
}

function normalizeCakes(raw: unknown): IncomingCake[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c, idx): IncomingCake | null => {
      if (!c || typeof c !== 'object') return null
      const v = c as Record<string, unknown>
      const cakeType = v.cakeType != null && String(v.cakeType).trim() !== '' ? String(v.cakeType) : null
      const weight = v.weight != null && String(v.weight).trim() !== '' ? String(v.weight) : null
      const customWeight = v.customWeight != null && String(v.customWeight).trim() !== '' ? String(v.customWeight) : null
      const shape = v.shape != null && String(v.shape).trim() !== '' ? String(v.shape) : null
      const floors = v.floors != null && String(v.floors).trim() !== '' ? String(v.floors) : null
      // Drop empty entries
      if (!cakeType && !weight && !customWeight && !shape && !floors) return null
      return {
        cakeType,
        weight,
        customWeight,
        shape,
        floors,
        position: typeof v.position === 'number' ? v.position : idx + 1,
      }
    })
    .filter((c): c is IncomingCake => c !== null)
}

export const createOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body
    
    console.log('Received order data:', JSON.stringify(orderData, null, 2))

    const cakes = normalizeCakes(orderData.cakes)
    const hasAnyCake = cakes.length > 0

    // Validate required fields
    const baseRequiredFields = [
      'deliveryMethod',
      'staffName',
      'clientName',
      'pickupDate',
    ]

    const requiredFields = hasAnyCake
      ? [...baseRequiredFields, 'coating', 'decorType']
      : [...baseRequiredFields]

    let missingFields = requiredFields.filter((field) => {
      const value = orderData[field]
      return value === null || value === undefined || value === ''
    })

    if (!hasAnyCake && (!orderData.otherProducts || String(orderData.otherProducts).trim() === '')) {
      missingFields = [...missingFields, 'otherProducts']
    }

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      console.error('Order data received:', JSON.stringify(orderData, null, 2))
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields,
        message: `Lipsesc câmpuri obligatorii: ${missingFields.join(', ')}`,
      })
    }

    const phoneDigits = normalizePhoneDigits(String(orderData.phoneNumber ?? ''))

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

    // Reject pickup dates in the past (compare in Bucharest timezone)
    const todayStr = getBucharestTodayString()
    const pickupStr = pickupDateObj.toISOString().slice(0, 10)
    if (pickupStr < todayStr) {
      console.error('pickupDate in the past:', pickupStr, 'today:', todayStr)
      return res.status(400).json({
        error: 'pickupDate in the past',
        message: 'Data ridicării nu poate fi în trecut.',
      })
    }

    // Idempotency: if this key was already used, return the existing order
    const idempotencyKey = orderData.idempotencyKey ? String(orderData.idempotencyKey).trim() : null
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: {
          photos: {
            select: { id: true, url: true, path: true, isFoaieDeZahar: true, createdAt: true },
          },
          cakes: { orderBy: { position: 'asc' } },
        },
      })
      if (existing) {
        console.log(`[createOrder] Idempotency hit – returning existing order #${existing.orderNumber} for key ${idempotencyKey}`)
        return res.status(201).json({ ...existing, orderNumber: existing.orderNumber })
      }
    }

    // Atomically reserve the next order number in a transaction to avoid duplicates
    console.log('Reserving next order number...')
    const { orderNumber, orderId } = await prisma.$transaction(async (tx) => {
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
      const createdByUsername = orderData.createdByUsername ? String(orderData.createdByUsername).trim() : null
      console.log('[createOrder] Setting createdByUsername:', createdByUsername)

      if (!createdByUsername || createdByUsername === '') {
        console.warn('[createOrder] WARNING: createdByUsername is missing or empty! Order will not appear in user history.')
      }
      
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          idempotencyKey: idempotencyKey || undefined,
          deliveryMethod: String(orderData.deliveryMethod),
          location: orderData.location ? String(orderData.location) : null,
          address: orderData.address ? String(orderData.address) : null,
          staffName: String(orderData.staffName),
          clientName: String(orderData.clientName).trim(),
          phoneNumber: phoneDigits,
          pickupDate: pickupDateObj,
          pickupTime: orderData.pickupTime ? String(orderData.pickupTime) : null,
          tomorrowVerification: Boolean(orderData.tomorrowVerification),
          advance: orderData.advance ? parseFloat(orderData.advance.toString()) : null,
          otherProducts: orderData.otherProducts ? String(orderData.otherProducts) : null,
          coating: orderData.coating ? String(orderData.coating) : null,
          colors: Array.isArray(orderData.colors) ? orderData.colors.map((c: unknown) => String(c)) : [],
          decorType: orderData.decorType ? String(orderData.decorType) : null,
          decorDetails: orderData.decorDetails ? String(orderData.decorDetails) : null,
          observations: orderData.observations ? String(orderData.observations) : null,
          hasPastry: Boolean(orderData.hasPastry),
          createdByUsername: createdByUsername,
          cakes: cakes.length > 0
            ? {
                create: cakes.map((c, idx) => ({
                  position: c.position ?? idx + 1,
                  cakeType: c.cakeType,
                  weight: c.weight,
                  customWeight: c.customWeight,
                  shape: c.shape,
                  floors: c.floors,
                })),
              }
            : undefined,
        },
        include: { photos: true, cakes: { orderBy: { position: 'asc' } } },
      })

      return { 
        orderNumber: createdOrder.orderNumber, 
        orderId: createdOrder.id,
      }
    })

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
      include: { 
        photos: {
          select: {
            id: true,
            url: true,
            path: true,
            isFoaieDeZahar: true,
            createdAt: true,
          },
        },
        cakes: { orderBy: { position: 'asc' } },
      },
    })

    console.log(`Order created successfully: ${orderNumber} with ${orderWithPhotos?.photos?.length || 0} photos`)
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
      include: { photos: true, cakes: { orderBy: { position: 'asc' } } },
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
        photos: {
          select: {
            id: true,
            url: true,
            path: true,
            isFoaieDeZahar: true,
            createdAt: true,
          },
        },
        cakes: { orderBy: { position: 'asc' } },
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

export const getDeliveryLocations = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isDeliveryLocation: true },
      select: { username: true },
      orderBy: { username: 'asc' },
    })
    res.json({ locations: users.map((u) => u.username) })
  } catch (error) {
    console.error('Error fetching delivery locations:', error)
    res.status(500).json({ error: 'Failed to fetch delivery locations' })
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

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    // Get username from auth token (stored in Authorization header)
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const username = authHeader.substring(7).trim() // Remove 'Bearer ' prefix and trim whitespace
    
    console.log('[getUserOrders] Request from username:', username)
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 1)
    cutoffDate.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
      where: {
        createdByUsername: username,
        pickupDate: {
          gte: cutoffDate,
        },
      },
      include: { 
        photos: {
          select: {
            id: true,
            url: true,
            path: true,
            isFoaieDeZahar: true,
            createdAt: true,
          },
        },
        cakes: { orderBy: { position: 'asc' } },
        pickedUpBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[getUserOrders] Returning ${orders.length} orders after date filter (cutoff: ${cutoffDate.toISOString()})`)
    
    res.json(orders)
  } catch (error) {
    console.error('Error fetching user orders:', error)
    res.status(500).json({ error: 'Failed to fetch user orders' })
  }
}

export const getMyStaffNames = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest
    const userId = authReq.userId
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { staffNames: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const staffNames = Array.isArray(user.staffNames) ? user.staffNames : (user.staffNames ? [] : [])
    res.json({ staffNames })
  } catch (error) {
    console.error('Error fetching staff names:', error)
    res.status(500).json({ error: 'Failed to fetch staff names' })
  }
}

export const updateMyStaffNames = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest
    const userId = authReq.userId
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { staffNames } = req.body
    if (!Array.isArray(staffNames)) {
      return res.status(400).json({ error: 'staffNames must be an array of strings' })
    }

    const validNames = staffNames
      .filter((n: unknown) => typeof n === 'string' && (n as string).trim())
      .map((n: string) => (n as string).trim().toUpperCase())

    await prisma.user.update({
      where: { id: userId },
      data: { staffNames: validNames },
    })

    res.json({ staffNames: validNames })
  } catch (error) {
    console.error('Error updating staff names:', error)
    res.status(500).json({ error: 'Failed to update staff names' })
  }
}
