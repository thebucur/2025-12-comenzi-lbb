import PDFDocument from 'pdfkit'
import prisma from '../lib/prisma'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'

const PDF_DIR = process.env.PDF_DIR || path.join(process.cwd(), 'pdfs')

export const generatePDF = async (orderId: string): Promise<string> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { photos: true },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  // Ensure PDF directory exists
  await fs.mkdir(PDF_DIR, { recursive: true })

  const doc = new PDFDocument({ margin: 50 })
  const filename = `order-${order.orderNumber}.pdf`
  const filepath = path.join(PDF_DIR, filename)
  const stream = createWriteStream(filepath)
  doc.pipe(stream)

  // Header
  doc.fontSize(20).text(`Comandă #${order.orderNumber}`, { align: 'center' })
  doc.moveDown()

  // Order Details
  doc.fontSize(14).text('Detalii comandă:', { underline: true })
  doc.fontSize(12)
  doc.text(`Client: ${order.clientName}`)
  doc.text(`Telefon: 07${order.phoneNumber}`)
  doc.text(`Metodă: ${order.deliveryMethod === 'ridicare' ? 'Ridicare' : 'Livrare'}`)
  if (order.location) doc.text(`Locație: ${order.location}`)
  if (order.address) doc.text(`Adresă: ${order.address}`)
  doc.text(`Preia comanda: ${order.staffName}`)
  doc.text(`Data: ${new Date(order.pickupDate).toLocaleDateString('ro-RO')}`)
  if (order.advance) doc.text(`Avans: ${order.advance} RON`)
  doc.moveDown()

  // Cake Details
  doc.fontSize(14).text('Detalii tort:', { underline: true })
  doc.fontSize(12)
  doc.text(`Tip: ${order.cakeType}`)
  doc.text(`Greutate: ${order.weight === 'ALTĂ GREUTATE' ? order.customWeight : order.weight}`)
  if (order.shape) doc.text(`Formă: ${order.shape}`)
  if (order.floors) doc.text(`Etaje: ${order.floors}`)
  if (order.otherProducts) doc.text(`Alte produse: ${order.otherProducts}`)
  doc.moveDown()

  // Decor Details
  doc.fontSize(14).text('Detalii decor:', { underline: true })
  doc.fontSize(12)
  doc.text(`Îmbrăcat în: ${order.coating}`)
  if (order.colors.length > 0) doc.text(`Culori: ${order.colors.join(', ')}`)
  doc.text(`Tip decor: ${order.decorType}`)
  if (order.decorDetails) doc.text(`Detalii: ${order.decorDetails}`)
  if (order.observations) doc.text(`Observații: ${order.observations}`)
  doc.moveDown()

  // Photos
  if (order.photos.length > 0) {
    doc.fontSize(14).text('Poze:', { underline: true })
    doc.moveDown()
    // Note: Embedding images in PDF requires additional processing
    // For now, we'll just list the photo URLs
    order.photos.forEach((photo, index) => {
      doc.text(`Poza ${index + 1}: ${photo.url}`)
    })
  }

  doc.end()

  // Wait for stream to finish
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', (err) => reject(err))
  })

  // Update order with PDF path
  await prisma.order.update({
    where: { id: orderId },
    data: { pdfPath: filepath },
  })

  return filepath
}

