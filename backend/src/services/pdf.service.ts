import PDFDocument from 'pdfkit'
import prisma from '../lib/prisma'
import fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import path from 'path'
import https from 'https'
import sharp from 'sharp'

const PDF_DIR = process.env.PDF_DIR || path.join(process.cwd(), 'pdfs')
const FONTS_DIR = path.join(process.cwd(), 'fonts')

// Helper function to replace Romanian diacritics with non-diacritic letters
const removeDiacritics = (text: string | null | undefined): string => {
  if (!text) return ''
  
  return text
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/Ă/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Î/g, 'I')
    .replace(/Ș/g, 'S')
    .replace(/Ț/g, 'T')
}

// Helper function to download file
const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        file.close()
        return downloadFile(response.headers.location!, dest).then(resolve).catch(reject)
      }
      if (response.statusCode !== 200) {
        file.close()
        fs.unlink(dest).catch(() => {})
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      fs.unlink(dest).catch(() => {})
      reject(err)
    })
  })
}

// Ensure Roboto fonts are available
const ensureRobotoFonts = async (): Promise<{ regular: string | null; bold: string | null }> => {
  try {
    await fs.mkdir(FONTS_DIR, { recursive: true })
    
    const robotoRegularPath = path.join(FONTS_DIR, 'Roboto-Regular.ttf')
    const robotoBoldPath = path.join(FONTS_DIR, 'Roboto-Bold.ttf')
    
    // Download Roboto Regular if not exists
    if (!existsSync(robotoRegularPath)) {
      console.log('Downloading Roboto-Regular font...')
      try {
        // Try multiple sources for Roboto font
        const sources = [
          'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf',
          'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf',
          'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'
        ]
        
        let downloaded = false
        for (const source of sources) {
          try {
            await downloadFile(source, robotoRegularPath)
            console.log(`Roboto-Regular downloaded successfully from ${source}`)
            downloaded = true
            break
          } catch (err) {
            console.log(`Failed to download from ${source}, trying next source...`)
          }
        }
        
        if (!downloaded) {
          throw new Error('All download sources failed')
        }
      } catch (error) {
        console.error('Failed to download Roboto-Regular:', error)
        // Continue without Roboto, will use fallback fonts
      }
    }
    
    // Download Roboto Bold if not exists
    if (!existsSync(robotoBoldPath)) {
      console.log('Downloading Roboto-Bold font...')
      try {
        const sources = [
          'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
          'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf',
          'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf'
        ]
        
        let downloaded = false
        for (const source of sources) {
          try {
            await downloadFile(source, robotoBoldPath)
            console.log(`Roboto-Bold downloaded successfully from ${source}`)
            downloaded = true
            break
          } catch (err) {
            console.log(`Failed to download from ${source}, trying next source...`)
          }
        }
        
        if (!downloaded) {
          throw new Error('All download sources failed')
        }
      } catch (error) {
        console.error('Failed to download Roboto-Bold:', error)
        // Continue without Roboto, will use fallback fonts
      }
    }
    
    // Verify fonts exist before returning
    const regularExists = existsSync(robotoRegularPath)
    const boldExists = existsSync(robotoBoldPath)
    
    return {
      regular: regularExists ? robotoRegularPath : null,
      bold: boldExists ? robotoBoldPath : null,
    }
  } catch (error) {
    console.error('Error ensuring Roboto fonts:', error)
    return { regular: null, bold: null }
  }
}

export const generatePDF = async (orderId: string): Promise<string> => {
  try {
    console.log(`Starting PDF generation for order ${orderId}`)
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { photos: true },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    console.log(`Order found: ${order.orderNumber}`)

    // Ensure PDF directory exists
    await fs.mkdir(PDF_DIR, { recursive: true })
    console.log(`PDF directory ensured: ${PDF_DIR}`)

  // Ensure Roboto fonts are available
  const fonts = await ensureRobotoFonts()

  // Slightly tighter margins to keep everything on one page
  const doc = new PDFDocument({ margin: 40 })
  const filename = `order-${order.orderNumber}.pdf`
  const filepath = path.join(PDF_DIR, filename)
  const stream = createWriteStream(filepath)
  doc.pipe(stream)

  // Register Roboto fonts if available, otherwise use default fonts
  let fontRegular = 'Helvetica'
  let fontBold = 'Helvetica-Bold'
  let fontsLoaded = false
  
  if (fonts.regular && fonts.bold) {
    try {
      // Verify font files exist and are readable
      await fs.access(fonts.regular)
      await fs.access(fonts.bold)
      
      doc.registerFont('Roboto', fonts.regular)
      doc.registerFont('Roboto-Bold', fonts.bold)
      fontRegular = 'Roboto'
      fontBold = 'Roboto-Bold'
      fontsLoaded = true
      console.log('Using Roboto fonts for PDF generation')
    } catch (error) {
      console.error('Failed to register Roboto fonts, using default fonts:', error)
      fontsLoaded = false
    }
  } else {
    console.log('Roboto fonts not available, using default fonts (Helvetica)')
    console.log('Note: Helvetica may not fully support Romanian diacritics')
  }

  // Set default font for the document
  doc.font(fontRegular).fontSize(12)

  // Layout helpers
  const margins = (doc as any).page?.margins || { left: 50, right: 50, top: 50, bottom: 50 }
  const columnGap = 24
  const availableWidth = doc.page.width - margins.left - margins.right
  const leftColumnWidth = Math.max(availableWidth * 0.55, availableWidth - 240) // ensure text column stays readable
  const rightColumnWidth = availableWidth - leftColumnWidth - columnGap

  // Colors
  const labelColor = '#c1121f' // red for field labels
  const textColor = '#000000'

  // Helper function to add a field with bold label
  const addField = (label: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') return
    
    const cleanLabel = removeDiacritics(label)
    const cleanValue = removeDiacritics(value)

    const remainingHeight = doc.page.height - margins.bottom - doc.y
    if (remainingHeight <= 0) return // hard stop to keep single page

    const x = margins.left
    const y = doc.y
    doc.fillColor(labelColor)
    doc.font(fontBold).fontSize(12).text(`${cleanLabel}: `, x, y, {
      continued: true,
      width: leftColumnWidth,
    })
    doc.fillColor(textColor)
    doc.font(fontRegular).fontSize(12).text(cleanValue, {
      width: leftColumnWidth,
    })
    doc.moveDown(0.2) // add a small spacer for readability
  }

  // Header
  doc.font(fontBold).fontSize(20).text(removeDiacritics(`Comanda #${order.orderNumber}`), { align: 'center' })
  doc.moveDown(0.5)

  const columnStartY = doc.y

  // Order Details
  doc.font(fontBold).fontSize(14).text(removeDiacritics('Detalii comanda:'), margins.left, doc.y, {
    underline: true,
    width: leftColumnWidth,
  })
  doc.moveDown(0.3)
  addField('Client', order.clientName)
  addField('Telefon', `07${order.phoneNumber}`)
  addField('Metodă', order.deliveryMethod === 'ridicare' ? 'Ridicare' : 'Livrare')
  addField('Locație', order.location || undefined)
  addField('Adresă', order.address || undefined)
  addField('Preia comanda', order.staffName)
  addField('Data', new Date(order.pickupDate).toLocaleDateString('ro-RO'))
  if (order.advance) addField('Avans', `${order.advance} RON`)
  doc.moveDown()

  // Cake Details
  doc.font(fontBold).fontSize(14).text(removeDiacritics('Detalii tort:'), margins.left, doc.y, {
    underline: true,
    width: leftColumnWidth,
  })
  doc.moveDown(0.3)
  addField('Tip', order.cakeType)
  addField('Greutate', order.weight === 'ALTĂ GREUTATE' ? order.customWeight : order.weight)
  addField('Formă', order.shape || undefined)
  addField('Etaje', order.floors || undefined)
  
  // Special handling for "Alte produse" with yellow background
  if (order.otherProducts) {
    const cleanLabel = removeDiacritics('Alte produse')
    const cleanValue = removeDiacritics(order.otherProducts)
    
    const x = margins.left
    const y = doc.y
    
    // Calculate the height needed for the text
    const labelWidth = doc.font(fontBold).fontSize(12).widthOfString(`${cleanLabel}: `)
    const fullText = `${cleanLabel}: ${cleanValue}`
    const textHeight = doc.font(fontRegular).fontSize(12).heightOfString(fullText, {
      width: leftColumnWidth,
    })
    
    // Add padding for the background
    const padding = 4
    
    // Draw yellow background rectangle
    doc.rect(x - padding, y - padding, leftColumnWidth + padding * 2, textHeight + padding * 2)
       .fill('#FFFF00')
    
    // Now draw the text on top
    doc.fillColor(labelColor)
    doc.font(fontBold).fontSize(12).text(`${cleanLabel}: `, x, y, {
      continued: true,
      width: leftColumnWidth,
    })
    doc.fillColor(textColor)
    doc.font(fontRegular).fontSize(12).text(cleanValue, {
      width: leftColumnWidth,
    })
    doc.moveDown(0.2)
  }
  
  doc.moveDown(0.4)

  // Decor Details
  doc.font(fontBold).fontSize(14).text(removeDiacritics('Detalii decor:'), margins.left, doc.y, {
    underline: true,
    width: leftColumnWidth,
  })
  doc.moveDown(0.3)
  addField('Îmbrăcat în', order.coating)
  if (order.colors.length > 0) {
    addField('Culori', order.colors.join(', '))
  }
  addField('Tip decor', order.decorType)
  addField('Detalii', order.decorDetails || undefined)
  addField('Observații', order.observations || undefined)
  doc.moveDown(0.4)

  // Photos
  const photosToRender = order.photos.slice(0, 3)

  if (photosToRender.length > 0) {
    const photoColumnX = margins.left + leftColumnWidth + columnGap
    const photoLabel = removeDiacritics('Poze:')
    const photoHeadingHeight = doc
      .font(fontBold)
      .fontSize(14)
      .heightOfString(photoLabel, { width: rightColumnWidth })

    // Ensure we always start the photo column aligned with the first section
    const startY = columnStartY
    const availableHeight = doc.page.height - margins.bottom - startY
    const photoGap = 4
    const maxPhotos = photosToRender.length
    const cellHeight = Math.max((availableHeight - photoGap * (maxPhotos - 1)) / maxPhotos, 28)
    const imageMaxHeight = cellHeight

    doc.font(fontBold).fontSize(14).text(photoLabel, photoColumnX, startY, {
      underline: true,
      width: rightColumnWidth,
    })

    // Helper to resolve an image path, handling relative paths
    const resolveImagePath = (photoPath: string | null): string | null => {
      if (!photoPath) return null
      if (existsSync(photoPath)) return photoPath
      if (!path.isAbsolute(photoPath)) {
        const absolutePath = path.join(process.cwd(), photoPath)
        if (existsSync(absolutePath)) return absolutePath
      }
      return null
    }

    for (let i = 0; i < photosToRender.length; i++) {
      const photo = photosToRender[i]
      const resolvedPath = resolveImagePath(photo.path)
      const cellY = startY + photoHeadingHeight + 8 + i * (cellHeight + photoGap)
      const fallbackText = removeDiacritics(photo.url || 'Imagine indisponibila')

      if (resolvedPath) {
        try {
          const metadata = await sharp(resolvedPath).metadata()
          const aspectRatio = (metadata.width || 1) / (metadata.height || 1)
          let targetWidth = rightColumnWidth
          let targetHeight = targetWidth / aspectRatio

          if (targetHeight > imageMaxHeight) {
            targetHeight = imageMaxHeight
            targetWidth = targetHeight * aspectRatio
          }

          const imageX = photoColumnX + (rightColumnWidth - targetWidth) / 2
          const imageY = cellY

          doc.image(resolvedPath, imageX, imageY, {
            width: targetWidth,
            height: targetHeight,
          })
        } catch (error) {
          console.error(`Error embedding image ${resolvedPath}:`, error)
          doc.font(fontRegular).fontSize(10).text(fallbackText, photoColumnX, cellY + imageMaxHeight / 2 - 6, {
            width: rightColumnWidth,
            align: 'center',
          })
        }
      } else {
        console.log(`Image path not found, showing URL: ${photo.url}`)
        doc.font(fontRegular).fontSize(10).text(fallbackText, photoColumnX, cellY + imageMaxHeight / 2 - 6, {
          width: rightColumnWidth,
          align: 'center',
        })
      }
    }
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

    console.log(`PDF generated successfully: ${filepath}`)
    return filepath
  } catch (error) {
    console.error('Error in generatePDF:', error)
    throw error
  }
}

