import { Request, Response } from 'express'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import prisma from '../lib/prisma'

// Use Railway persistent volume for production, local directory for development
// Railway volume should be mounted at /app/storage
const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STORAGE_BASE, 'uploads')

interface PendingPhoto {
  url: string
  path: string
  filename: string
  isFoaieDeZahar?: boolean
  isOtherProducts?: boolean
}

const PENDING_UPLOAD_TTL_DAYS = Number(process.env.PENDING_UPLOAD_TTL_DAYS || 7)
const MAX_CAKE_PHOTOS = 3
const MAX_OTHER_PRODUCT_PHOTOS = 2

async function countSessionPhotos(
  sessionId: string,
  isOtherProducts: boolean,
  orderId: string | null,
): Promise<number> {
  const pendingCount = await prisma.uploadPhoto.count({
    where: {
      uploadSessionId: sessionId,
      linkedAt: null,
      isFoaieDeZahar: false,
      isOtherProducts,
    },
  })

  if (!orderId) return pendingCount

  const orderCount = await prisma.photo.count({
    where: {
      orderId,
      isFoaieDeZahar: false,
      isOtherProducts,
    },
  })

  return pendingCount + orderCount
}

async function ensureUploadSession(sessionId: string) {
  return prisma.uploadSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId },
    update: {},
    select: { id: true, orderId: true },
  })
}

async function cleanupOldPendingUploads(): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_UPLOAD_TTL_DAYS * 24 * 60 * 60 * 1000)
  try {
    await prisma.uploadPhoto.deleteMany({
      where: {
        linkedAt: null,
        createdAt: { lt: cutoff },
      },
    })
  } catch (err) {
    console.warn('[cleanupOldPendingUploads] failed:', err instanceof Error ? err.message : err)
  }
}

export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : [])

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { sessionId } = req.params
    const isOtherProducts =
      req.query.otherProducts === 'true' ||
      req.body?.otherProducts === true ||
      req.body?.otherProducts === 'true'

    const maxPhotos = isOtherProducts ? MAX_OTHER_PRODUCT_PHOTOS : MAX_CAKE_PHOTOS
    const uploadSession = await ensureUploadSession(sessionId)
    const existingCount = await countSessionPhotos(sessionId, isOtherProducts, uploadSession.orderId)

    if (existingCount >= maxPhotos) {
      return res.status(400).json({
        error: isOtherProducts
          ? 'Poți încărca maximum 2 poze pentru alte produse.'
          : 'Poți încărca maximum 3 poze.',
      })
    }

    const allowedFiles = files.slice(0, maxPhotos - existingCount)
    if (allowedFiles.length === 0) {
      return res.status(400).json({ error: 'Limita de poze a fost atinsă.' })
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    // Best-effort cleanup to avoid unbounded growth
    await cleanupOldPendingUploads()

    const results: PendingPhoto[] = []

    // Process files SEQUENTIALLY to prevent memory spikes
    // This is critical for Railway's limited memory environment
    for (const file of allowedFiles) {
      try {
        console.log(`Processing file ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        // Compress and resize image with more aggressive compression for Railway
        const compressed = await sharp(file.buffer)
          .resize(800, 800, { // Reduced from 1000x1000 to save memory
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 75 }) // Reduced from 80 to save space and memory
          .toBuffer()

        console.log(`Compressed to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`)

        // Generate unique filename
        const filename = `${uuidv4()}.jpg`
        const filepath = path.join(UPLOAD_DIR, filename)

        // Save file
        await fs.writeFile(filepath, compressed)
        
        // Clear buffer from memory immediately after writing
        file.buffer = Buffer.alloc(0)

        // Return URL (in production, this would be a cloud storage URL)
        const url = `/uploads/${filename}`

        // Persist session + pending uploads in DB so it works across instances
        if (uploadSession.orderId) {
          // Order already exists, save photo immediately with retry logic
          let retries = 3
          let saved = false
          
          while (retries > 0 && !saved) {
            try {
              await prisma.photo.create({
                data: {
                  orderId: uploadSession.orderId,
                  url,
                  path: filepath,
                  isOtherProducts,
                },
              })
              console.log(`Photo saved immediately for order ${uploadSession.orderId}`)
              saved = true
            } catch (dbError: any) {
              retries--
              if (retries === 0) throw dbError
              console.warn(`Database error, retrying... (${retries} attempts left)`, dbError.message)
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
            }
          }
        } else {
          // Order doesn't exist yet, store photo as pending
          await prisma.uploadPhoto.create({
            data: {
              uploadSessionId: sessionId,
              url,
              path: filepath,
              filename,
              isFoaieDeZahar: false,
              isOtherProducts,
            },
          })
          console.log(`Photo stored as pending for session ${sessionId}`, {
            url,
            path: filepath,
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
        // Continue processing other files instead of failing completely
        // Clean up any partial file
        const partialPath = path.join(UPLOAD_DIR, `${uuidv4()}.jpg`)
        try {
          await fs.unlink(partialPath).catch(() => {})
        } catch {}
      }
    }

    if (results.length === 0) {
      return res.status(500).json({
        error: 'Failed to process any images',
        message: 'All file uploads failed',
      })
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

export async function sessionHasOtherProductPhotos(sessionId: string | null | undefined): Promise<boolean> {
  if (!sessionId || String(sessionId).trim() === '') return false
  const count = await prisma.uploadPhoto.count({
    where: {
      uploadSessionId: String(sessionId).trim(),
      isOtherProducts: true,
    },
  })
  return count > 0
}

export const linkSessionToOrder = async (sessionId: string, orderId: string) => {
  console.log(`Linking session ${sessionId} to order ${orderId}`)

  // Persist session→order mapping in DB (works across instances)
  await prisma.uploadSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, orderId },
    update: { orderId },
    select: { id: true },
  })

  // Consume all pending uploads from DB and attach to order in a single transaction
  let retries = 3
  while (retries > 0) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const pending = await tx.uploadPhoto.findMany({
            where: { uploadSessionId: sessionId, linkedAt: null },
            orderBy: { createdAt: 'asc' },
          })

          console.log(`Found ${pending.length} pending photos for session ${sessionId}`)
          if (pending.length === 0) return

          for (const p of pending) {
            const created = await tx.photo.create({
              data: {
                orderId,
                url: p.url,
                path: p.path,
                isFoaieDeZahar: p.isFoaieDeZahar,
                isOtherProducts: p.isOtherProducts,
              },
              select: { id: true },
            })

            await tx.uploadPhoto.update({
              where: { id: p.id },
              data: { linkedAt: new Date(), linkedPhotoId: created.id },
            })
          }
        },
        { maxWait: 5000, timeout: 15000 },
      )

      return
    } catch (err) {
      retries--
      console.error(`Error linking pending photos to order (${retries} retries left):`, err)
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 2000 * (4 - retries)))
      }
    }
  }
}

export const getPhotosBySession = (sessionId: string): PendingPhoto[] => {
  // Kept for backward-compat in code paths; session photos are persisted in DB now.
  // Prefer `getPhotosBySessionId` endpoint.
  return []
}

export const getPhotosBySessionId = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    await ensureUploadSession(sessionId)
    const pendingPhotos = await prisma.uploadPhoto.findMany({
      where: { uploadSessionId: sessionId, linkedAt: null, isFoaieDeZahar: false, isOtherProducts: false },
      select: { id: true, url: true, path: true, filename: true },
      orderBy: { createdAt: 'asc' },
    })

    const pendingOtherProductPhotos = await prisma.uploadPhoto.findMany({
      where: { uploadSessionId: sessionId, linkedAt: null, isFoaieDeZahar: false, isOtherProducts: true },
      select: { id: true, url: true, path: true, filename: true },
      orderBy: { createdAt: 'asc' },
    })
    
    // Verify files exist before returning URLs (important for Railway's ephemeral filesystem)
    const verifiedPhotos = []
    for (const photo of pendingPhotos) {
      try {
        // Check if file exists on disk
        const fileExists = photo.path ? await fs.access(photo.path).then(() => true).catch(() => false) : false
        if (fileExists) {
          verifiedPhotos.push({
            url: photo.url,
            filename: photo.filename,
          })
        } else {
          console.warn(`Photo file not found on disk, skipping: ${photo.path} (URL: ${photo.url})`)
          await prisma.uploadPhoto.delete({ where: { id: photo.id } })
        }
      } catch (error) {
        console.error(`Error verifying photo file ${photo.path}:`, error)
      }
    }
    
    const verifiedOtherProductPhotos = []
    for (const photo of pendingOtherProductPhotos) {
      try {
        const fileExists = photo.path ? await fs.access(photo.path).then(() => true).catch(() => false) : false
        if (fileExists) {
          verifiedOtherProductPhotos.push({
            url: photo.url,
            filename: photo.filename,
          })
        } else {
          console.warn(`Other product photo file not found on disk, skipping: ${photo.path} (URL: ${photo.url})`)
          await prisma.uploadPhoto.delete({ where: { id: photo.id } })
        }
      } catch (error) {
        console.error(`Error verifying other product photo file ${photo.path}:`, error)
      }
    }
    
    // Also check for foaie de zahar and verify it exists
    const pendingFoaieDeZahar = await prisma.uploadPhoto.findFirst({
      where: { uploadSessionId: sessionId, linkedAt: null, isFoaieDeZahar: true },
      select: { id: true, url: true, path: true, filename: true },
      orderBy: { createdAt: 'desc' },
    })
    let foaieDeZahar = null
    
    if (pendingFoaieDeZahar) {
      try {
        const fileExists = pendingFoaieDeZahar.path
          ? await fs.access(pendingFoaieDeZahar.path).then(() => true).catch(() => false)
          : false
        if (fileExists) {
          foaieDeZahar = {
            url: pendingFoaieDeZahar.url,
            filename: pendingFoaieDeZahar.filename,
          }
        } else {
          console.warn(`Foaie de zahar file not found on disk, skipping: ${pendingFoaieDeZahar.path} (URL: ${pendingFoaieDeZahar.url})`)
          await prisma.uploadPhoto.delete({ where: { id: pendingFoaieDeZahar.id } })
        }
      } catch (error) {
        console.error(`Error verifying foaie de zahar file ${pendingFoaieDeZahar.path}:`, error)
        await prisma.uploadPhoto.delete({ where: { id: pendingFoaieDeZahar.id } }).catch(() => {})
      }
    }
    
    console.log(`Getting photos for session ${sessionId}:`, {
      pendingCount: pendingPhotos.length,
      verifiedCount: verifiedPhotos.length,
      otherProductPendingCount: pendingOtherProductPhotos.length,
      otherProductVerifiedCount: verifiedOtherProductPhotos.length,
      hasFoaieDeZahar: !!foaieDeZahar,
      foaieDeZaharUrl: foaieDeZahar?.url,
      removedCount: pendingPhotos.length - verifiedPhotos.length,
    })
    
    res.json({ 
      photos: verifiedPhotos, 
      otherProductPhotos: verifiedOtherProductPhotos,
      count: verifiedPhotos.length,
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
    const pendingPhotosCount = await prisma.uploadPhoto.count({
      where: { uploadSessionId: sessionId, linkedAt: null, isFoaieDeZahar: false },
    })
    res.json({ 
      success: true, 
      message: 'Pozele au fost trimise',
      count: pendingPhotosCount,
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
    await cleanupOldPendingUploads()

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

      const uploadSession = await ensureUploadSession(sessionId)
      if (uploadSession.orderId) {
        // Order already exists, try to save photo immediately with flag and retry logic
        let retries = 3
        let saved = false
        
        while (retries > 0 && !saved) {
          try {
            await prisma.photo.create({
              data: {
                orderId: uploadSession.orderId,
                url,
                path: filepath,
                isFoaieDeZahar: true,
              },
            })
            console.log(`Foaie de zahar photo saved immediately for order ${uploadSession.orderId}`)
            saved = true
          } catch (dbError: any) {
            // If column doesn't exist, save without the flag
            if (dbError?.code === 'P2022') {
              console.log('isFoaieDeZahar column not found, saving as regular photo')
              try {
                await prisma.photo.create({
                  data: {
                    orderId: uploadSession.orderId,
                    url,
                    path: filepath,
                  },
                })
                saved = true
              } catch (fallbackError) {
                retries--
                if (retries === 0) throw fallbackError
                console.warn(`Database error, retrying... (${retries} attempts left)`)
                await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
              }
            } else {
              retries--
              if (retries === 0) throw dbError
              console.warn(`Database error, retrying... (${retries} attempts left)`, dbError.message)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
            }
          }
        }
      } else {
        // Order doesn't exist yet, store photo as pending in DB (keep newest as the one that matters)
        await prisma.uploadPhoto.create({
          data: {
            uploadSessionId: sessionId,
            url: photoData.url,
            path: photoData.path,
            filename: photoData.filename,
            isFoaieDeZahar: true,
          },
        })
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

