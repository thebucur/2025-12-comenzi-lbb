import { Router } from 'express'
import { createOrder, getOrder, listOrders, getNextOrderNumber, getUserOrders, getMyStaffNames, updateMyStaffNames, getDeliveryLocations } from '../controllers/orders.controller'
import { generatePDF } from '../services/pdf.service'
import { sendOrderEmail, getDevCcEmail } from '../services/email.service'
import prisma from '../lib/prisma'
import fs from 'fs'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/', createOrder)
router.get('/next-number', getNextOrderNumber)
router.get('/delivery-locations', authenticate, getDeliveryLocations)
router.get('/my-orders', authenticate, getUserOrders)
router.get('/staff-names', authenticate, getMyStaffNames)
router.put('/staff-names', authenticate, updateMyStaffNames)
router.get('/:id', getOrder)
router.get('/', listOrders)

const FALLBACK_EMAIL = 'abucur@gmail.com'

async function getConfiguredRecipientEmail(): Promise<string> {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { category_key: { category: 'pdfSettings', key: 'settings' } },
    })
    if (config && config.value && typeof config.value === 'object') {
      const val = config.value as Record<string, unknown>
      if (typeof val.recipientEmail === 'string' && val.recipientEmail) {
        return val.recipientEmail
      }
    }
  } catch (err) {
    console.error('[Email] Eroare la citirea recipientEmail din config:', err)
  }
  return FALLBACK_EMAIL
}

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
    
    const targetEmail = recipientEmail || await getConfiguredRecipientEmail()
    const willSendEmail = shouldSendEmail !== false && !!targetEmail

    // Respond immediately - email will be sent in background
    res.json({ success: true, pdfPath, emailQueued: willSendEmail })

    if (willSendEmail) {
      getDevCcEmail().then((ccEmail) => {
        sendOrderEmail(orderNumber, targetEmail, pdfPath, ccEmail || undefined)
          .then(() => console.log(`[Email] Trimis cu succes comanda #${orderNumber} către ${targetEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''}`))
          .catch((err) => console.error(`[Email] Eroare comanda #${orderNumber}:`, getEmailErrorMessage(err), err))
      })
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
    const { filepath: pdfPath, orderNumber } = await generatePDF(id)

    const fileStream = fs.createReadStream(pdfPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=comanda-${orderNumber}.pdf`)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Error serving PDF:', error)
    res.status(500).json({ error: 'Failed to serve PDF' })
  }
})

export default router

