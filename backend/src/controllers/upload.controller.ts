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

export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { sessionId } = req.params

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    // Compress and resize image
    const compressed = await sharp(req.file.buffer)
      .resize(2000, 2000, {
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

    // If we have an order ID for this session, save the photo
    const orderId = sessionToOrderMap.get(sessionId)
    if (orderId) {
      await prisma.photo.create({
        data: {
          orderId,
          url,
          path: filepath,
        },
      })
    }

    res.json({ url, filename })
  } catch (error) {
    console.error('Error uploading photo:', error)
    res.status(500).json({ error: 'Failed to upload photo' })
  }
}

export const linkSessionToOrder = (sessionId: string, orderId: string) => {
  sessionToOrderMap.set(sessionId, orderId)
}

export { sessionToOrderMap }

