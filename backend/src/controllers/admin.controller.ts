import { Request, Response } from 'express'
import prisma from '../lib/prisma'

console.log('Admin controller loaded, prisma:', prisma ? 'initialized' : 'UNDEFINED')

export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        photos: true,
        pickedUpBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(order)
  } catch (error) {
    console.error('Error fetching order details:', error)
    res.status(500).json({ error: 'Failed to fetch order details' })
  }
}

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.json(users)
  } catch (error) {
    console.error('Error listing users:', error)
    res.status(500).json({ error: 'Failed to list users' })
  }
}

export const createUser = async (req: Request, res: Response) => {
  try {
    console.log('createUser called, prisma:', prisma ? 'OK' : 'UNDEFINED')
    console.log('prisma.user:', prisma?.user ? 'OK' : 'UNDEFINED')
    
    const { username, password, location, email } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Validate username format
    if (typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username must be a non-empty string' })
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters long' })
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    })
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Hash password
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const userData = {
      username: username.trim(),
      password: hashedPassword,
    }
    
    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' })
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    console.log('User created:', user.id)

    const result = user

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error creating user:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    // Provide more specific error messages
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field'
      return res.status(400).json({ 
        error: `${field} already exists`,
        details: error.meta 
      })
    }
    

    // Return the actual error message if available, otherwise generic message
    const errorMessage = error.message || 'Failed to create user'
    res.status(500).json({ 
      error: errorMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { username, password } = req.body

    const updateData: any = {}
    if (username) updateData.username = username
    // Only update password if it's provided and not empty
    if (password && password.trim()) {
      const bcrypt = require('bcrypt')
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.user.delete({
      where: { id },
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

export const downloadFoaieDeZahar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        photos: true,
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    console.log(`Looking for foaie de zahar for order ${order.orderNumber} (id: ${id})`, {
      totalPhotos: order.photos.length,
      photos: order.photos.map(p => ({
        id: p.id,
        url: p.url,
        path: p.path,
        isFoaieDeZahar: (p as any).isFoaieDeZahar,
      })),
    })

    // First, try to find photo with isFoaieDeZahar flag set to true
    let foaieDeZaharPhoto = order.photos.find(photo => (photo as any).isFoaieDeZahar === true)

    // If not found, try to find by filename pattern in path or URL
    if (!foaieDeZaharPhoto) {
      console.log('No photo with isFoaieDeZahar flag found, trying filename pattern match')
      foaieDeZaharPhoto = order.photos.find(photo => {
        const pathMatch = photo.path?.toLowerCase().includes('foaie-de-zahar')
        const urlMatch = photo.url?.toLowerCase().includes('foaie-de-zahar')
        return pathMatch || urlMatch
      })
    }

    if (!foaieDeZaharPhoto) {
      console.error(`Foaie de zahar photo not found for order ${order.orderNumber}`, {
        orderId: id,
        orderNumber: order.orderNumber,
        availablePhotos: order.photos.map(p => ({
          id: p.id,
          url: p.url,
          path: p.path,
          isFoaieDeZahar: (p as any).isFoaieDeZahar,
        })),
      })
      return res.status(404).json({ 
        error: 'Foaie de zahar photo not found for this order',
        orderNumber: order.orderNumber,
        availablePhotosCount: order.photos.length,
      })
    }

    if (!foaieDeZaharPhoto.path) {
      console.error(`Photo path missing for order ${order.orderNumber}`, {
        photoId: foaieDeZaharPhoto.id,
        url: foaieDeZaharPhoto.url,
      })
      return res.status(404).json({ error: 'Photo file path not found' })
    }

    const fs = require('fs')
    const path = require('path')
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    
    // Try multiple path resolution strategies
    let filePath = foaieDeZaharPhoto.path
    let resolvedPath: string | null = null

    // Strategy 1: Use path as-is if it exists
    if (filePath && fs.existsSync(filePath)) {
      resolvedPath = filePath
      console.log(`File found at original path: ${filePath}`)
    } else {
      // Strategy 2: Try constructing from URL (extract filename and use UPLOAD_DIR)
      if (foaieDeZaharPhoto.url) {
        const urlPath = foaieDeZaharPhoto.url.replace(/^\/uploads\//, '')
        const pathFromUrl = path.join(UPLOAD_DIR, urlPath)
        if (fs.existsSync(pathFromUrl)) {
          resolvedPath = pathFromUrl
          console.log(`File found using URL path: ${pathFromUrl}`)
        }
      }
      
      // Strategy 3: If path is absolute (Railway path like /app/backend/uploads/...), try as-is
      if (!resolvedPath && filePath && path.isAbsolute(filePath)) {
        // On Railway, the path might be correct but process.cwd() might be different
        // Try the path as-is first
        if (fs.existsSync(filePath)) {
          resolvedPath = filePath
          console.log(`File found at absolute Railway path: ${filePath}`)
        } else {
          // Try constructing from UPLOAD_DIR + filename
          const filename = path.basename(filePath)
          const pathFromUploadDir = path.join(UPLOAD_DIR, filename)
          if (fs.existsSync(pathFromUploadDir)) {
            resolvedPath = pathFromUploadDir
            console.log(`File found at UPLOAD_DIR: ${pathFromUploadDir}`)
          }
        }
      }
      
      // Strategy 4: Try relative to process.cwd()
      if (!resolvedPath && filePath) {
        const relativePath = path.isAbsolute(filePath)
          ? path.join(process.cwd(), path.basename(filePath))
          : path.join(process.cwd(), filePath)
        if (fs.existsSync(relativePath)) {
          resolvedPath = relativePath
          console.log(`File found at relative path: ${relativePath}`)
        }
      }
    }

    if (!resolvedPath) {
      // Final fallback: Try to serve via static route redirect
      // This handles cases where files might be accessible via /uploads but path resolution failed
      if (foaieDeZaharPhoto.url && foaieDeZaharPhoto.url.startsWith('/uploads/')) {
        console.log(`File not found via direct path, trying static route redirect for order ${order.orderNumber}`)
        console.log(`Redirecting to: ${foaieDeZaharPhoto.url}`)
        
        // Try to check if file exists via static route by attempting to read it
        const urlFilename = foaieDeZaharPhoto.url.replace(/^\/uploads\//, '')
        const staticPath = path.join(UPLOAD_DIR, urlFilename)
        
        // One more attempt with the exact filename from URL
        if (fs.existsSync(staticPath)) {
          resolvedPath = staticPath
          console.log(`File found via static route path: ${staticPath}`)
        } else {
          // List available files in uploads directory for debugging (first 10)
          try {
            const uploadFiles = fs.readdirSync(UPLOAD_DIR).slice(0, 10)
            console.log(`Available files in uploads (first 10):`, uploadFiles)
          } catch (err) {
            console.log(`Could not read uploads directory: ${err}`)
          }
          
          console.error(`Photo file not found on disk for order ${order.orderNumber}`, {
            originalPath: filePath,
            url: foaieDeZaharPhoto.url,
            uploadDir: UPLOAD_DIR,
            cwd: process.cwd(),
            staticPath: staticPath,
            triedPaths: [
              filePath,
              foaieDeZaharPhoto.url ? path.join(UPLOAD_DIR, foaieDeZaharPhoto.url.replace(/^\/uploads\//, '')) : null,
              filePath ? path.join(UPLOAD_DIR, path.basename(filePath)) : null,
              staticPath,
            ].filter(Boolean),
          })
          
          // Return 404 with detailed error
          return res.status(404).json({ 
            error: 'Photo file not found on disk',
            message: `The file for order ${order.orderNumber} does not exist on the server. The file may have been deleted or never uploaded to Railway.`,
            path: filePath,
            url: foaieDeZaharPhoto.url,
            uploadDir: UPLOAD_DIR,
            orderNumber: order.orderNumber,
          })
        }
      } else {
        console.error(`Photo file not found on disk for order ${order.orderNumber}`, {
          originalPath: filePath,
          url: foaieDeZaharPhoto.url,
          uploadDir: UPLOAD_DIR,
          cwd: process.cwd(),
          triedPaths: [
            filePath,
            foaieDeZaharPhoto.url ? path.join(UPLOAD_DIR, foaieDeZaharPhoto.url.replace(/^\/uploads\//, '')) : null,
            filePath ? path.join(UPLOAD_DIR, path.basename(filePath)) : null,
          ].filter(Boolean),
        })
        return res.status(404).json({ 
          error: 'Photo file not found on disk',
          path: filePath,
          url: foaieDeZaharPhoto.url,
          uploadDir: UPLOAD_DIR,
        })
      }
    }

    // Send file
    console.log(`Sending foaie de zahar file for order ${order.orderNumber}: ${resolvedPath}`)
    res.download(resolvedPath, `foaie-de-zahar-order-${order.orderNumber}${path.extname(resolvedPath)}`)
  } catch (error) {
    console.error('Error downloading foaie de zahar photo:', error)
    res.status(500).json({ error: 'Failed to download foaie de zahar photo' })
  }
}

export const listUploadsFiles = async (req: Request, res: Response) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    
    let files: string[] = []
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        files = fs.readdirSync(UPLOAD_DIR)
      }
    } catch (error) {
      console.error('Error reading uploads directory:', error)
    }
    
    // Filter for foaie-de-zahar files
    const foaieDeZaharFiles = files.filter(f => f.toLowerCase().includes('foaie-de-zahar'))
    
    res.json({
      uploadDir: UPLOAD_DIR,
      totalFiles: files.length,
      foaieDeZaharFiles: foaieDeZaharFiles,
      allFiles: files.slice(0, 50), // First 50 files
    })
  } catch (error) {
    console.error('Error listing uploads files:', error)
    res.status(500).json({ error: 'Failed to list uploads files' })
  }
}

export const fixFoaieDeZaharFlags = async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.query
    
    // Build where clause
    const whereClause: any = {}
    if (orderNumber) {
      whereClause.orderNumber = parseInt(orderNumber as string)
    }

    // Find all orders (or specific order if orderNumber provided)
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        photos: true,
      },
    })

    let fixedCount = 0
    const results: any[] = []

    for (const order of orders) {
      for (const photo of order.photos) {
        // Check if photo has "foaie-de-zahar" in filename but flag is not set
        const hasFoaieDeZaharInName = 
          photo.path?.toLowerCase().includes('foaie-de-zahar') ||
          photo.url?.toLowerCase().includes('foaie-de-zahar')
        
        const isFlagSet = (photo as any).isFoaieDeZahar === true

        if (hasFoaieDeZaharInName && !isFlagSet) {
          try {
            await prisma.photo.update({
              where: { id: photo.id },
              data: { isFoaieDeZahar: true },
            })
            fixedCount++
            results.push({
              orderNumber: order.orderNumber,
              orderId: order.id,
              photoId: photo.id,
              action: 'fixed',
            })
            console.log(`Fixed foaie de zahar flag for order ${order.orderNumber}, photo ${photo.id}`)
          } catch (error) {
            console.error(`Error fixing photo ${photo.id} for order ${order.orderNumber}:`, error)
            results.push({
              orderNumber: order.orderNumber,
              orderId: order.id,
              photoId: photo.id,
              action: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }
    }

    res.json({
      message: `Fixed ${fixedCount} photo(s)`,
      fixedCount,
      totalOrdersChecked: orders.length,
      results,
    })
  } catch (error) {
    console.error('Error fixing foaie de zahar flags:', error)
    res.status(500).json({ error: 'Failed to fix foaie de zahar flags' })
  }
}
