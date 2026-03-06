import { Router } from 'express'
import { createOrder, getOrder, listOrders, getNextOrderNumber, getUserOrders, getMyStaffNames, updateMyStaffNames } from '../controllers/orders.controller'
import { generatePDF } from '../services/pdf.service'
import { sendOrderEmail } from '../services/email.service'
import prisma from '../lib/prisma'
import fs from 'fs'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/', createOrder)
router.get('/next-number', getNextOrderNumber)
router.get('/my-orders', authenticate, getUserOrders)
router.get('/staff-names', authenticate, getMyStaffNames)
router.put('/staff-names', authenticate, updateMyStaffNames)
router.get('/:id', getOrder)
router.get('/', listOrders)

const RECIPIENT_EMAIL = 'abucur@gmail.com'

function getEmailErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    const resp = (err as { response?: string; responseCode?: number })?.response
    if (typeof resp === 'string') return `${msg} (${resp})`
    return msg
  }
  return String(err)
}

router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params
    const { sendEmail: shouldSendEmail, recipientEmail } = req.body || {}
    const { filepath: pdfPath, orderNumber } = await generatePDF(id)
    
    const targetEmail = recipientEmail || RECIPIENT_EMAIL
    const willSendEmail = shouldSendEmail !== false && !!targetEmail

    // Respond immediately - email will be sent in background
    res.json({ success: true, pdfPath, emailQueued: willSendEmail })

    // Fire-and-forget: send email in the background after responding
    if (willSendEmail) {
      sendOrderEmail(orderNumber, targetEmail, pdfPath)
        .then(() => console.log(`[Email] Trimis cu succes comanda #${orderNumber} către ${targetEmail}`))
        .catch((err) => console.error(`[Email] Eroare comanda #${orderNumber}:`, getEmailErrorMessage(err), err))
    }
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

