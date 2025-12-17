import { Request, Response } from 'express'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import prisma from '../lib/prisma'

// For Railway, we'll store files temporarily and then upload to cloud storage
// For now, using a simple file system approach (can be replaced with Cloudinary/S3)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

// Store session to order mapping (in production, use Redis or database)
const sessionToOrderMap = new Map<string, string>()

// Store pending photos by session ID (photos uploaded before order creation)
interface PendingPhoto {
  url: string
  path: string
  filename: string
  isFoaieDeZahar?: boolean
}
const pendingPhotosBySession = new Map<string, PendingPhoto[]>()
const pendingFoaieDeZaharBySession = new Map<string, PendingPhoto>()

export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : [])

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { sessionId } = req.params

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    const results: PendingPhoto[] = []

    for (const file of files) {
      try {
        // Compress and resize image
        const compressed = await sharp(file.buffer)
          .resize(1000, 1000, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        // Generate unique filename
        const filename = `${uuidv4()}.jpg`
        const filepath = path.join(UPLOAD_DIR, filename)

        // Save file
        await fs.writeFile(filepath, compressed)

        // Return URL (in production, this would be a cloud storage URL)
        const url = `/uploads/${filename}`

        // Check if we have an order ID for this session
        const orderId = sessionToOrderMap.get(sessionId)
        if (orderId) {
          // Order already exists, save photo immediately
          await prisma.photo.create({
            data: {
              orderId,
              url,
              path: filepath,
            },
          })
          console.log(`Photo saved immediately for order ${orderId}`)
        } else {
          // Order doesn't exist yet, store photo as pending
          if (!pendingPhotosBySession.has(sessionId)) {
            pendingPhotosBySession.set(sessionId, [])
          }
          pendingPhotosBySession.get(sessionId)!.push({ url, path: filepath, filename })
          console.log(`Photo stored as pending for session ${sessionId}`, {
            url,
            path: filepath,
            totalPending: pendingPhotosBySession.get(sessionId)!.length,
          })
        }

        results.push({ url, path: filepath, filename })
      } catch (fileErr) {
        console.error('File processing failed', {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          error: fileErr,
        })
        return res.status(500).json({
          error: 'Failed to process image',
          message: fileErr instanceof Error ? fileErr.message : 'Unknown error',
        })
      }
    }

    // Keep backwards compatibility: return first url plus full list
    const first = results[0]
    res.json({ url: first?.url, filename: first?.filename, photos: results.map((r) => ({ url: r.url, filename: r.filename })) })
  } catch (error) {
    console.error('Error uploading photo:', {
      error,
      filesMeta: Array.isArray(req.files)
        ? (req.files as Express.Multer.File[]).map((f) => ({
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : undefined,
      uploadDir: UPLOAD_DIR,
      sessionId: req.params.sessionId,
    })
    res.status(500).json({
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const linkSessionToOrder = async (sessionId: string, orderId: string) => {
  console.log(`Linking session ${sessionId} to order ${orderId}`)
  sessionToOrderMap.set(sessionId, orderId)
  
  // Link all pending photos for this session to the order
  const pendingPhotos = pendingPhotosBySession.get(sessionId)
  console.log(`Found ${pendingPhotos?.length || 0} pending photos for session ${sessionId}`)
  
  if (pendingPhotos && pendingPhotos.length > 0) {
    console.log(`Linking ${pendingPhotos.length} pending photos to order ${orderId}`, {
      photos: pendingPhotos.map(p => ({ url: p.url, path: p.path })),
    })
    
    try {
      // Save all pending photos to database (without isFoaieDeZahar for regular photos)
      const createdPhotos = await prisma.photo.createMany({
        data: pendingPhotos.map(photo => ({
          orderId,
          url: photo.url,
          path: photo.path,
        })),
      })
      
      console.log(`Successfully linked ${createdPhotos.count} photos to order ${orderId}`)
      
      // Verify photos were saved
      const verifyPhotos = await prisma.photo.findMany({
        where: { orderId },
        select: { id: true, url: true, path: true },
      })
      console.log(`Verified ${verifyPhotos.length} photos in database for order ${orderId}`)
      
      // Clear pending photos for this session
      pendingPhotosBySession.delete(sessionId)
    } catch (error) {
      console.error('Error linking pending photos to order:', error)
      // Don't throw - order is already created
    }
  } else {
    console.log(`No pending photos found for session ${sessionId}`)
  }

  // Link pending foaie de zahar photo if exists
  const pendingFoaieDeZahar = pendingFoaieDeZaharBySession.get(sessionId)
  if (pendingFoaieDeZahar) {
    console.log(`Linking pending foaie de zahar photo to order ${orderId}`, {
      url: pendingFoaieDeZahar.url,
      path: pendingFoaieDeZahar.path,
      isFoaieDeZahar: pendingFoaieDeZahar.isFoaieDeZahar,
    })
    
    try {
      // Try to save the foaie de zahar photo with the flag
      const createdPhoto = await prisma.photo.create({
        data: {
          orderId,
          url: pendingFoaieDeZahar.url,
          path: pendingFoaieDeZahar.path,
          isFoaieDeZahar: true,
        },
      })
      
      console.log(`Successfully linked foaie de zahar photo to order ${orderId}`, {
        photoId: createdPhoto.id,
        isFoaieDeZahar: createdPhoto.isFoaieDeZahar,
      })
      
      // Verify it was saved correctly
      const verifyPhoto = await prisma.photo.findUnique({
        where: { id: createdPhoto.id },
        select: { id: true, isFoaieDeZahar: true, url: true },
      })
      console.log(`Verified foaie de zahar photo in DB:`, verifyPhoto)
      
      // Clear pending foaie de zahar photo for this session
      pendingFoaieDeZaharBySession.delete(sessionId)
    } catch (error: any) {
      console.error('Error linking pending foaie de zahar photo to order:', error)
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        meta: error?.meta,
      })
      
      // If it's a column not found error (P2022), try saving without the flag
      if (error?.code === 'P2022') {
        console.log('isFoaieDeZahar column not found, saving as regular photo')
        try {
          await prisma.photo.create({
            data: {
              orderId,
              url: pendingFoaieDeZahar.url,
              path: pendingFoaieDeZahar.path,
            },
          })
          pendingFoaieDeZaharBySession.delete(sessionId)
        } catch (fallbackError) {
          console.error('Error saving foaie de zahar as regular photo:', fallbackError)
        }
      }
      // Don't throw - order is already created
    }
  } else {
    console.log(`No pending foaie de zahar photo found for session ${sessionId}`)
  }
}

export const getPhotosBySession = (sessionId: string): PendingPhoto[] => {
  return pendingPhotosBySession.get(sessionId) || []
}

export const getPhotosBySessionId = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const pendingPhotos = getPhotosBySession(sessionId)
    
    // Return photos with absolute URLs
    const photos = pendingPhotos.map(photo => ({
      url: photo.url,
      filename: photo.filename,
    }))
    
    // Also check for foaie de zahar
    const pendingFoaieDeZahar = pendingFoaieDeZaharBySession.get(sessionId)
    const foaieDeZahar = pendingFoaieDeZahar ? {
      url: pendingFoaieDeZahar.url,
      filename: pendingFoaieDeZahar.filename,
    } : null
    
    res.json({ 
      photos, 
      count: photos.length,
      foaieDeZahar 
    })
  } catch (error) {
    console.error('Error getting photos by session:', error)
    res.status(500).json({ error: 'Failed to get photos' })
  }
}

export const markPhotosAsSent = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    // Photos are already stored, just confirm they're ready
    const pendingPhotos = getPhotosBySession(sessionId)
    res.json({ 
      success: true, 
      message: 'Pozele au fost trimise',
      count: pendingPhotos.length 
    })
  } catch (error) {
    console.error('Error marking photos as sent:', error)
    res.status(500).json({ error: 'Failed to mark photos as sent' })
  }
}

export const uploadFoaieDeZahar = async (req: Request, res: Response) => {
  try {
    const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : null)

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { sessionId } = req.params

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    try {
      // Save file WITHOUT compression - original size
      const originalExtension = path.extname(file.originalname) || '.jpg'
      const filename = `foaie-de-zahar-${uuidv4()}${originalExtension}`
      const filepath = path.join(UPLOAD_DIR, filename)

      // Save original file buffer directly (no compression)
      await fs.writeFile(filepath, file.buffer)

      // Return URL (in production, this would be a cloud storage URL)
      const url = `/uploads/${filename}`

      const photoData: PendingPhoto = { url, path: filepath, filename, isFoaieDeZahar: true }

      // Check if we have an order ID for this session
      const orderId = sessionToOrderMap.get(sessionId)
      if (orderId) {
        // Order already exists, try to save photo immediately with flag
        try {
          await prisma.photo.create({
            data: {
              orderId,
              url,
              path: filepath,
              isFoaieDeZahar: true,
            },
          })
          console.log(`Foaie de zahar photo saved immediately for order ${orderId}`)
        } catch (dbError: any) {
          // If column doesn't exist, save without the flag
          if (dbError?.code === 'P2022') {
            console.log('isFoaieDeZahar column not found, saving as regular photo')
            await prisma.photo.create({
              data: {
                orderId,
                url,
                path: filepath,
              },
            })
          } else {
            throw dbError
          }
        }
      } else {
        // Order doesn't exist yet, store photo as pending (replace any existing one)
        pendingFoaieDeZaharBySession.set(sessionId, photoData)
        console.log(`Foaie de zahar photo stored as pending for session ${sessionId}`)
      }

      res.json({ url, filename })
    } catch (fileErr) {
      console.error('File processing failed', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        error: fileErr,
      })
      return res.status(500).json({
        error: 'Failed to process image',
        message: fileErr instanceof Error ? fileErr.message : 'Unknown error',
      })
    }
  } catch (error) {
    console.error('Error uploading foaie de zahar photo:', {
      error,
      fileMeta: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : undefined,
      uploadDir: UPLOAD_DIR,
      sessionId: req.params.sessionId,
    })
    res.status(500).json({
      error: 'Failed to upload foaie de zahar photo',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export { sessionToOrderMap, pendingFoaieDeZaharBySession }

