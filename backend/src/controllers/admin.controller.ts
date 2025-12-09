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
        installation: true,
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

export const listInstallations = async (req: Request, res: Response) => {
  try {
    const installations = await prisma.installation.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(installations)
  } catch (error) {
    console.error('Error listing installations:', error)
    res.status(500).json({ error: 'Failed to list installations' })
  }
}


export const updateInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, location, email, settings } = req.body
    const installation = await prisma.installation.update({
      where: { id },
      data: {
        name,
        location: location || null,
        email: email || null,
        settings: settings || null,
      },
    })
    res.json(installation)
  } catch (error) {
    console.error('Error updating installation:', error)
    res.status(500).json({ error: 'Failed to update installation' })
  }
}

export const deleteInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.installation.delete({
      where: { id },
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting installation:', error)
    res.status(500).json({ error: 'Failed to delete installation' })
  }
}

export const listUsers = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query
    const where: any = {}
    if (installationId) {
      where.installationId = installationId as string
    }
    const users = await prisma.user.findMany({
      where,
      include: { installation: true },
      select: {
        id: true,
        username: true,
        installationId: true,
        installation: true,
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

    // Use transaction to create both installation and user atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create installation automatically for the new user
      // Convert empty strings to null
      const installationData: any = {
        name: username.trim(), // Use username as installation name
      }
      
      if (location && location.trim()) {
        installationData.location = location.trim()
      }
      
      if (email && email.trim()) {
        installationData.email = email.trim()
      }
      
      console.log('Creating installation with data:', installationData)
      const installation = await tx.installation.create({
        data: installationData,
      })
      console.log('Installation created:', installation.id)

      // Create user with the new installation
      const userData = {
        username: username.trim(),
        password: hashedPassword,
        installationId: installation.id,
      }
      
      console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' })
      const user = await tx.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          installationId: true,
          installation: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      console.log('User created:', user.id)

      return user
    })

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
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return res.status(400).json({ 
        error: 'Invalid installation reference',
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
        installationId: true,
        installation: true,
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
