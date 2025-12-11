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
      include: { installation: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Return user info (without password) and installation info
    const { password: _, ...userWithoutPassword } = user
    res.json({
      user: userWithoutPassword,
      installation: user.installation,
    })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

export const getInstallationConfig = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.params

    // Get all global configs with their installation-specific overrides
    const globalConfigs = await prisma.globalConfig.findMany({
      include: {
        installations: {
          where: {
            installationId,
          },
        },
      },
    })

    // Build configuration object
    const config: any = {
      sortiment: {},
      decor: {},
    }

    globalConfigs.forEach((gc: any) => {
      // Check if there's an InstallationConfig entry for this installation
      const installationConfig = gc.installations.find((ic: any) => ic.installationId === installationId)
      
      // Include config if:
      // 1. No InstallationConfig entry exists (enabled by default for all installations)
      // 2. InstallationConfig exists and is enabled
      const isEnabled = !installationConfig || installationConfig.enabled
      
      if (isEnabled) {
        if (!config[gc.category]) {
          config[gc.category] = {}
        }
        config[gc.category][gc.key] = gc.value
      }
    })

    res.json(config)
  } catch (error) {
    console.error('Error fetching installation config:', error)
    res.status(500).json({ error: 'Failed to fetch configuration' })
  }
}

