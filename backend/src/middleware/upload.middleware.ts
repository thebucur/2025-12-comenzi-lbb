import multer from 'multer'
import { Request } from 'express'

// Use memory storage for Railway (files will be uploaded to cloud storage)
const storage = multer.memoryStorage()

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Reduced to 5MB per file to prevent memory issues
    files: 3, // Limit to 3 files per request to prevent memory overload
  },
})

// Accept common field names we use in clients
// Reduced maxCount from 10 to 3 to prevent memory exhaustion on Railway
export const uploadPhotos = upload.fields([
  { name: 'photo', maxCount: 3 },
  { name: 'photos', maxCount: 3 },
  { name: 'file', maxCount: 3 },
])

// Fallback to accept anything (kept for compatibility)
export const uploadAny = upload.any()

export default upload















