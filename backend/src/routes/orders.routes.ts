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
    
    // Get order to send email
    const order = await prisma.order.findUnique({
      where: { id },
      include: { installation: true },
    })

    if (order && order.installation?.email) {
      try {
        await sendOrderEmail(order.orderNumber, order.installation.email, pdfPath)
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the request if email fails
      }
    }

    res.json({ success: true, pdfPath })
  } catch (error) {
    console.error('Error generating PDF:', error)
    res.status(500).json({ error: 'Failed to generate PDF' })
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

