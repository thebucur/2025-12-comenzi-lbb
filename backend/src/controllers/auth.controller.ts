import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user
    res.json({
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

export const getGlobalConfig = async (req: Request, res: Response) => {
  try {
    // Get all global configs
    const globalConfigs = await prisma.globalConfig.findMany()

    // Build configuration object
    const config: any = {
      sortiment: {},
      decor: {},
    }

    globalConfigs.forEach((gc) => {
      if (!config[gc.category]) {
        config[gc.category] = {}
      }
      config[gc.category][gc.key] = gc.value
    })

    res.json(config)
  } catch (error) {
    console.error('Error fetching global config:', error)
    res.status(500).json({ error: 'Failed to fetch configuration' })
  }
}

