import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  userId?: string
  user?: {
    id: string
    username: string
  }
}

// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      userId?: string
      user?: {
        id: string
        username: string
      }
    }
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    // For now, we'll use username as token (simple approach)
    // In production, use JWT tokens
    
    const user = await prisma.user.findUnique({
      where: { username: token },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.userId = user.id
    req.user = {
      id: user.id,
      username: user.username
    }
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}

