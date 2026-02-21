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

    // Admin user must not login from main frontend (wizard) - only via admin panel
    const loginContext = req.body?.loginContext
    if (user.username === 'admin' && loginContext !== 'admin') {
      return res.status(403).json({
        error: 'Autentificarea utilizatorului admin nu este permisă din aplicația principală.'
      })
    }

    // Return user info (without password) and token
    // For now, we use username as token (as per auth.middleware.ts)
    // In production, use JWT tokens
    const { password: _, ...userWithoutPassword } = user
    res.json({
      user: userWithoutPassword,
      token: user.username, // Token is username (matches auth.middleware.ts logic)
      _deployTest: "v2-" + new Date().toISOString(), // Test to verify deployment
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

export const seedAdmin = async (req: Request, res: Response) => {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    if (existingAdmin) {
      // Verify password works
      const passwordValid = await bcrypt.compare('0000', existingAdmin.password)
      if (passwordValid) {
        return res.json({ 
          message: 'Admin user already exists and password is correct',
          username: 'admin',
          password: '0000'
        })
      } else {
        // Update password if it doesn't match
        const adminPassword = await bcrypt.hash('0000', 10)
        await prisma.user.update({
          where: { username: 'admin' },
          data: { password: adminPassword },
        })
        return res.json({ 
          message: 'Admin user password reset',
          username: 'admin',
          password: '0000'
        })
      }
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('0000', 10)
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
      },
    })

    res.json({ 
      message: 'Admin user created successfully',
      username: 'admin',
      password: '0000'
    })
  } catch (error) {
    console.error('Error seeding admin user:', error)
    res.status(500).json({ error: 'Failed to seed admin user', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}

