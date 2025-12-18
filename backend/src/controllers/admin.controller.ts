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
    const fsPromises = require('fs/promises')
    const path = require('path')
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    
    console.log(`[Railway Debug] Starting file resolution for order ${order.orderNumber}`, {
      photoId: foaieDeZaharPhoto.id,
      originalPath: foaieDeZaharPhoto.path,
      url: foaieDeZaharPhoto.url,
      uploadDir: UPLOAD_DIR,
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV,
    })
    
    // Try multiple path resolution strategies
    // PRIORITY: URL-based path first (most reliable on Railway after redeploy)
    let filePath = foaieDeZaharPhoto.path
    let resolvedPath: string | null = null

    // Strategy 1 (HIGHEST PRIORITY): Try constructing from URL first
    // This is most reliable on Railway because URL is relative and consistent
    if (foaieDeZaharPhoto.url) {
      // Remove /uploads/ prefix if present, and any leading slashes
      let urlPath = foaieDeZaharPhoto.url.replace(/^\/uploads\//, '').replace(/^\//, '')
      
      // Try direct path from URL
      const pathFromUrl = path.join(UPLOAD_DIR, urlPath)
      if (fs.existsSync(pathFromUrl)) {
        resolvedPath = pathFromUrl
        console.log(`[Railway Debug] File found using URL path: ${pathFromUrl}`)
      } else {
        // Try with just the filename (in case URL has subdirectories that don't exist)
        const filename = path.basename(urlPath)
        const pathFromFilename = path.join(UPLOAD_DIR, filename)
        if (fs.existsSync(pathFromFilename)) {
          resolvedPath = pathFromFilename
          console.log(`[Railway Debug] File found using filename from URL: ${pathFromFilename}`)
        }
      }
    }

    // Strategy 2: Use original path as-is if it exists (might work on Railway)
    if (!resolvedPath && filePath && fs.existsSync(filePath)) {
      resolvedPath = filePath
      console.log(`[Railway Debug] File found at original path: ${filePath}`)
    } else if (!resolvedPath && filePath) {
      // Strategy 3: If path is absolute, try extracting just filename
      if (path.isAbsolute(filePath)) {
        const filename = path.basename(filePath)
        const pathFromUploadDir = path.join(UPLOAD_DIR, filename)
        if (fs.existsSync(pathFromUploadDir)) {
          resolvedPath = pathFromUploadDir
          console.log(`[Railway Debug] File found by extracting filename from absolute path: ${pathFromUploadDir}`)
        }
      }
      
      // Strategy 4: Try relative to process.cwd()
      if (!resolvedPath) {
        const relativePath = path.isAbsolute(filePath)
          ? path.join(process.cwd(), path.basename(filePath))
          : path.join(process.cwd(), filePath)
        if (fs.existsSync(relativePath)) {
          resolvedPath = relativePath
          console.log(`[Railway Debug] File found at relative path: ${relativePath}`)
        }
      }
    }

    // Final fallback: Try to find file by searching for order number in filename
    if (!resolvedPath) {
      try {
        if (fs.existsSync(UPLOAD_DIR)) {
          const allFiles = fs.readdirSync(UPLOAD_DIR)
          const orderNumberStr = order.orderNumber.toString()
          
          // Look for files with foaie-de-zahar AND order number
          const matchingFiles = allFiles.filter((f: string) => {
            const lowerF = f.toLowerCase()
            return lowerF.includes('foaie-de-zahar') && 
                   (lowerF.includes(orderNumberStr) || 
                    lowerF.includes(`order-${orderNumberStr}`) ||
                    lowerF.includes(`order${orderNumberStr}`))
          })
          
          if (matchingFiles.length > 0) {
            // Use the first matching file (should usually be only one)
            const matchedFile = matchingFiles[0]
            const matchedPath = path.join(UPLOAD_DIR, matchedFile)
            if (fs.existsSync(matchedPath)) {
              resolvedPath = matchedPath
              console.log(`[Railway Debug] File found by searching for order number: ${matchedPath}`)
            }
          }
        }
      } catch (searchError) {
        console.log(`[Railway Debug] Error searching for file by order number: ${searchError}`)
      }
    }

    if (!resolvedPath) {
      // Final fallback: Try to serve via static route redirect
      // This handles cases where files might be accessible via /uploads but path resolution failed
      // On Railway, filesystem is ephemeral, so files might not exist on disk after redeploy
      // If we have a URL, redirect to it (the static route handler will serve it if it exists)
      if (foaieDeZaharPhoto.url && foaieDeZaharPhoto.url.startsWith('/uploads/')) {
        console.log(`[Railway Debug] File not found on disk, trying to serve via static route for order ${order.orderNumber}`)
        console.log(`[Railway Debug] Static URL: ${foaieDeZaharPhoto.url}`)
        
        // Try one more time with exact filename from URL (in case uploads dir was recreated)
        const urlFilename = foaieDeZaharPhoto.url.replace(/^\/uploads\//, '').replace(/^\//, '')
        const staticPath = path.join(UPLOAD_DIR, urlFilename)
        
        // Ensure uploads directory exists
        try {
          await fsPromises.mkdir(UPLOAD_DIR, { recursive: true })
          if (fs.existsSync(staticPath)) {
            resolvedPath = staticPath
            console.log(`[Railway Debug] File found after creating uploads directory: ${staticPath}`)
          }
        } catch (mkdirError) {
          console.log(`[Railway Debug] Could not create uploads directory: ${mkdirError}`)
        }
        
        // If still not found, try to redirect to static route
        // This will work if file is accessible via the /uploads endpoint
        if (!resolvedPath) {
          // List available files in uploads directory for debugging
          let availableFiles: string[] = []
          let foaieDeZaharFiles: string[] = []
          try {
            if (fs.existsSync(UPLOAD_DIR)) {
              availableFiles = fs.readdirSync(UPLOAD_DIR)
              foaieDeZaharFiles = availableFiles.filter((f: string) => f.toLowerCase().includes('foaie-de-zahar'))
              console.log(`[Railway Debug] Available files in uploads: ${availableFiles.length} total`)
              console.log(`[Railway Debug] Files with 'foaie-de-zahar' in name: ${foaieDeZaharFiles.length}`)
              if (foaieDeZaharFiles.length > 0) {
                console.log(`[Railway Debug] Foaie de zahar files (first 20):`, foaieDeZaharFiles.slice(0, 20))
              }
              if (availableFiles.length > 0 && availableFiles.length <= 50) {
                console.log(`[Railway Debug] All upload files:`, availableFiles)
              } else if (availableFiles.length > 50) {
                console.log(`[Railway Debug] First 50 upload files:`, availableFiles.slice(0, 50))
              }
            } else {
              console.log(`[Railway Debug] UPLOAD_DIR does not exist: ${UPLOAD_DIR}`)
            }
          } catch (err) {
            console.log(`[Railway Debug] Could not read uploads directory: ${err}`)
          }
          
          // Try to find any foaie-de-zahar file that might match this order
          let potentialMatches: string[] = []
          if (foaieDeZaharFiles.length > 0 && filePath) {
            const searchFilename = path.basename(filePath).toLowerCase()
            const orderNumberStr = order.orderNumber.toString()
            potentialMatches = foaieDeZaharFiles.filter((f: string) => 
              f.toLowerCase().includes(orderNumberStr) || 
              f.toLowerCase().includes(searchFilename)
            )
            console.log(`[Railway Debug] Potential matching files:`, potentialMatches)
          }
          
          console.error(`[Railway Debug] Photo file not found on disk for order ${order.orderNumber}`, {
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
            availableFoaieDeZaharFiles: foaieDeZaharFiles,
            potentialMatches: potentialMatches,
          })
          
          // On Railway, filesystem is ephemeral - files are lost on redeploy
          // Redirect to static URL as last resort (even though it probably won't work if file doesn't exist)
          console.log(`[Railway Debug] Attempting redirect to static URL: ${foaieDeZaharPhoto.url}`)
          const staticUrl = foaieDeZaharPhoto.url.startsWith('http') 
            ? foaieDeZaharPhoto.url 
            : `${req.protocol}://${req.get('host')}${foaieDeZaharPhoto.url}`
          
          // Return redirect to static URL
          return res.redirect(302, staticUrl)
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
    if (!resolvedPath) {
      return res.status(404).json({ error: 'Photo file path could not be resolved' })
    }

    // Ensure path is absolute (required by res.sendFile)
    const absolutePath = path.isAbsolute(resolvedPath) 
      ? resolvedPath 
      : path.resolve(resolvedPath)
    
    console.log(`Sending foaie de zahar file for order ${order.orderNumber}: ${absolutePath}`)
    
    // Check if file exists and is readable
    try {
      await fsPromises.access(absolutePath, fs.constants.R_OK)
    } catch (accessError) {
      console.error(`File is not readable: ${absolutePath}`, accessError)
      return res.status(404).json({ 
        error: 'Photo file is not accessible',
        message: `The file for order ${order.orderNumber} exists but cannot be read.`,
        path: absolutePath,
      })
    }

    // Get file stats for content length
    const stats = await fsPromises.stat(absolutePath)
    
    // Determine content type based on file extension
    const ext = path.extname(absolutePath).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const contentType = contentTypeMap[ext] || 'application/octet-stream'
    
    // Set headers for blob download
    const filename = `foaie-de-zahar-order-${order.orderNumber}${ext}`
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', stats.size)
    
    // Send file using sendFile (requires absolute path)
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error(`Error sending file for order ${order.orderNumber}:`, err)
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to send file',
            message: err.message,
          })
        }
      }
    })
  } catch (error: any) {
    console.error('Error downloading foaie de zahar photo:', error)
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to download foaie de zahar photo',
        message: error.message || 'Unknown error occurred',
      })
    }
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
    const foaieDeZaharFiles = files.filter((f: string) => f.toLowerCase().includes('foaie-de-zahar'))
    
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
