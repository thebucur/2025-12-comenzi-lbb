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
}
const pendingPhotosBySession = new Map<string, PendingPhoto[]>()

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
        console.log(`Photo stored as pending for session ${sessionId}`)
      }

      results.push({ url, path: filepath, filename })
    }

    // Keep backwards compatibility: return first url plus full list
    const first = results[0]
    res.json({ url: first?.url, filename: first?.filename, photos: results.map((r) => ({ url: r.url, filename: r.filename })) })
  } catch (error) {
    console.error('Error uploading photo:', error)
    res.status(500).json({ error: 'Failed to upload photo' })
  }
}

export const linkSessionToOrder = async (sessionId: string, orderId: string) => {
  sessionToOrderMap.set(sessionId, orderId)
  
  // Link all pending photos for this session to the order
  const pendingPhotos = pendingPhotosBySession.get(sessionId)
  if (pendingPhotos && pendingPhotos.length > 0) {
    console.log(`Linking ${pendingPhotos.length} pending photos to order ${orderId}`)
    
    try {
      // Save all pending photos to database
      await prisma.photo.createMany({
        data: pendingPhotos.map(photo => ({
          orderId,
          url: photo.url,
          path: photo.path,
        })),
      })
      
      console.log(`Successfully linked ${pendingPhotos.length} photos to order ${orderId}`)
      
      // Clear pending photos for this session
      pendingPhotosBySession.delete(sessionId)
    } catch (error) {
      console.error('Error linking pending photos to order:', error)
      // Don't throw - order is already created
    }
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
    
    res.json({ photos, count: photos.length })
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

export { sessionToOrderMap }

