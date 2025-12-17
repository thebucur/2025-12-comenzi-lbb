import { Router } from 'express'
import { createOrder, getOrder, listOrders, getNextOrderNumber } from '../controllers/orders.controller'
import { generatePDF } from '../services/pdf.service'
import { sendOrderEmail } from '../services/email.service'
import prisma from '../lib/prisma'
import fs from 'fs'

const router = Router()

router.post('/', createOrder)
router.get('/next-number', getNextOrderNumber)
router.get('/:id', getOrder)
router.get('/', listOrders)

router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params
    const pdfPath = await generatePDF(id)
    
    // Note: Email sending would need to be configured separately
    // For now, PDF generation is successful without email

    res.json({ success: true, pdfPath })
  } catch (error) {
    console.error('Error generating PDF:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    })
  }
})

router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order || !order.pdfPath) {
      return res.status(404).json({ error: 'PDF not found' })
    }

    const fileStream = fs.createReadStream(order.pdfPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=comanda-${order.orderNumber}.pdf`)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Error serving PDF:', error)
    res.status(500).json({ error: 'Failed to serve PDF' })
  }
})

export default router

