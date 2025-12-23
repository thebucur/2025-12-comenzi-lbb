import PDFDocument from 'pdfkit'
import prisma from '../lib/prisma'
import fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import path from 'path'
import https from 'https'
import sharp from 'sharp'

// Use Railway persistent volume for production, local directory for development
// Railway volume should be mounted at /app/storage
const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
const PDF_DIR = process.env.PDF_DIR || path.join(STORAGE_BASE, 'pdfs')
const FONTS_DIR = process.env.FONTS_DIR || path.join(STORAGE_BASE, 'fonts')

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
      include: { 
        photos: {
          select: {
            id: true,
            url: true,
            path: true,
            isFoaieDeZahar: true,
            createdAt: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Debug: Log all photos and their isFoaieDeZahar status
    console.log(`Order #${order.orderNumber} has ${order.photos.length} photos:`)
    order.photos.forEach((photo, index) => {
      console.log(`  Photo ${index + 1}: isFoaieDeZahar = ${photo.isFoaieDeZahar} (type: ${typeof photo.isFoaieDeZahar})`)
    })

    // Filter out foaie de zahar photos from regular photos
    let regularPhotos = order.photos.filter(photo => photo.isFoaieDeZahar !== true)
    let foaieDeZaharPhoto = order.photos.find(photo => photo.isFoaieDeZahar === true) || null
    
    console.log(`Filtered: ${regularPhotos.length} regular photos, ${foaieDeZaharPhoto ? '1' : '0'} foaie de zahar photo`)

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
  if (order.noCake) {
    addField('Tort', 'NU ARE TORT')
  } else {
    addField('Tip', order.cakeType)
    addField('Greutate', order.weight === 'ALTĂ GREUTATE' ? order.customWeight : order.weight)
    addField('Formă', order.shape || undefined)
    addField('Etaje', order.floors || undefined)
  }
  
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
    
    // Save graphics state
    doc.save()
    
    // Draw yellow background rectangle
    doc.rect(x - padding, y - padding, leftColumnWidth + padding * 2, textHeight + padding * 2)
    doc.fillAndStroke('#FFFF00', '#FFFF00')
    
    // Restore graphics state
    doc.restore()
    
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

  // Decor Details - Only show if not noCake
  if (!order.noCake) {
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
  }

  // Photos (only regular photos, exclude foaie de zahar)
  const photosToRender = regularPhotos.slice(0, 3)

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

  // Add "ARE FOAIE DE ZAHAR" text at the very bottom of the page if photo exists
  // This should be the last thing added to the PDF
  if (foaieDeZaharPhoto) {
    const cleanText = removeDiacritics('ARE FOAIE DE ZAHAR')
    const x = margins.left
    
    // Calculate the height needed for the text
    const textHeight = doc.font(fontBold).fontSize(12).heightOfString(cleanText, {
      width: leftColumnWidth,
    })
    
    // Add padding for the background
    const padding = 4
    const totalHeight = textHeight + padding * 2
    
    // Always place at the bottom of the page, above the bottom margin
    // This ensures it's always at the end, regardless of content length
    const finalY = doc.page.height - margins.bottom - totalHeight
    
    // Save graphics state
    doc.save()
    
    // Draw yellow background rectangle
    doc.rect(x - padding, finalY - padding, leftColumnWidth + padding * 2, totalHeight)
    doc.fillAndStroke('#FFFF00', '#FFFF00')
    
    // Restore graphics state
    doc.restore()
    
    // Now draw the red text on top
    doc.fillColor('#FF0000')
    doc.font(fontBold).fontSize(12).text(cleanText, x, finalY, {
      width: leftColumnWidth,
    })
    doc.fillColor(textColor) // Reset to default text color
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

// Inventory categories - must match frontend constants
const INVENTORY_CATEGORIES = [
  {
    id: 'produse-bucata',
    name: 'PRODUSE LA BUCATA',
    units: ['buc.', 'g.', 'tava'],
    defaultUnit: 'buc.',
    products: [
      'Amandina',
      'Ora 12',
      'Ecler frisca',
      'Ecler vanilie farta',
      'Ecler fistic',
      'Ecler cafea',
      'Ecler ciocolata',
      'Ecler caramel sarat',
      'Savarine',
      'Blanche',
      'Kremsnit',
      'Extraordinar',
      'Mousse X3',
      'Mousse fructe de padure',
      'Tiramisu cupa',
      'Mura',
      'Mousse Snyx / felie',
      'Visine pe tocuri',
      'Mambo',
      'Paris Brest',
      'Pavlova',
      'Cannolo siciliani',
      'Mini tort amandina',
      'Mini tort inima',
      'Mousse fistic',
      'Mousse Rocher',
      'Pina Colada',
      'Pearl',
      'Mousse Kaffa',
    ],
  },
  {
    id: 'produse-kg',
    name: 'PRODUSE KG',
    units: ['tava', 'platou', 'rand'],
    defaultUnit: 'tava',
    products: [
      'Saratele',
      'Placinta cu mere dulce',
      'Placinta cu branza',
      'Gobs',
      'Turtite cu stafide',
      'Pricomigdale',
      'Cornulete',
      'Cracker vanzare',
      'Cracker cafea',
      'Minichoux',
      'Mini eclere',
      'Mini eclere cu fistic',
      'Mini Paris Brest',
      'Minitarte',
      'Raffaella',
      'Caramel',
      'Meringue',
      'Ardealul',
      'Tavalita',
      'Rulouri vanilie',
      'Rulouri ciocolata',
      'Praj cu branza si lam',
      'Linzer',
      'Alba ca zapada',
      'Dubai',
      'Dubai fara zahar',
      'Rulada Dubai',
      'Mini Excellent',
      'Mini Rocher',
      'Mix fructe',
    ],
  },
  {
    id: 'torturi-tarte',
    name: 'TORTURI SI TARTE',
    units: ['felie', 'buc.'],
    defaultUnit: 'felie',
    products: [
      'Tort belcolade intreg',
      'Tort belcolade feliat',
      'Tort fructe de padure',
      'Tort mousse X3',
      'Tort de zmeure',
      'Tort de mure',
      'Tort Ness feliat',
      'Tort amarena',
      'Tort fara zahar',
      'Tort padurea neagra',
      'Tort Snyx',
      'Tort Oreo',
      'Tarta cu branza',
      'Bavareza cu portocale',
      'Tort de biscuiti',
      'Tort Mambo',
      'Tort fistic, ciocolata, zmeure',
      'Tort Ferrero Rocher',
      'Cinnamon clasic',
      'Cinnamon fistic',
      'Cinnamon cafea',
    ],
  },
  {
    id: 'patiserie',
    name: 'PATISERIE',
    units: ['tava', 'platou'],
    defaultUnit: 'tava',
    products: [
      'Pateuri cu branza',
      'Strudele cu mere',
      'Rulouri cu branza',
      'Mini pateuri',
      'Mini ciuperci',
      'Mini carne',
      'Cozonac',
      'Pasca',
      'Croissant zmeure',
      'Croissant fistic',
    ],
  },
  {
    id: 'altele',
    name: 'ALTELE',
    units: ['buc.', 'g.'],
    defaultUnit: 'buc.',
    products: [
      'Alune',
      'Mucenici',
      'Cozonac fara zahar',
    ],
  },
  {
    id: 'post',
    name: 'POST',
    units: ['tava', 'platou', 'rand'],
    defaultUnit: 'tava',
    products: [
      'Minciunele',
      'Placinta cu dovleac',
      'Placinta cu mere',
      'Negresa',
      'Baclava',
      'Sarailie',
      'Sarailie fara zahar',
      'Salam de biscuiti',
    ],
  },
]

export const generateInventoryPDF = async (inventory: any): Promise<string> => {
  try {
    console.log(`Starting inventory PDF generation for ${inventory.username} on ${inventory.date}`)

    // Ensure PDF directory exists
    await fs.mkdir(PDF_DIR, { recursive: true })

    // Ensure Roboto fonts are available
    const fonts = await ensureRobotoFonts()

    // Create landscape A4 document (842x595 points)
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'landscape',
      margin: 15
    })
    
    const dateStr = new Date(inventory.date).toISOString().split('T')[0]
    const filename = `inventory-${inventory.username}-${dateStr}.pdf`
    const filepath = path.join(PDF_DIR, filename)
    const stream = createWriteStream(filepath)
    doc.pipe(stream)

    // Register Roboto fonts if available
    let fontRegular = 'Helvetica'
    let fontBold = 'Helvetica-Bold'
    
    if (fonts.regular && fonts.bold) {
      try {
        await fs.access(fonts.regular)
        await fs.access(fonts.bold)
        
        doc.registerFont('Roboto', fonts.regular)
        doc.registerFont('Roboto-Bold', fonts.bold)
        fontRegular = 'Roboto'
        fontBold = 'Roboto-Bold'
        console.log('Using Roboto fonts for inventory PDF generation')
      } catch (error) {
        console.error('Failed to register Roboto fonts, using default fonts:', error)
      }
    }

    // Layout configuration
    const margins = 15
    const pageWidth = 842 // A4 landscape width
    const pageHeight = 595 // A4 landscape height
    const availableWidth = pageWidth - margins * 2
    const availableHeight = pageHeight - margins * 2
    
    const columnGap = 10
    const columnWidth = (availableWidth - columnGap * 2) / 3
    
    // Sub-column widths within each main column
    const productNameWidth = columnWidth * 0.40
    const invWidth = columnWidth * 0.32
    const necWidth = columnWidth * 0.28
    
    const fontSize = 8
    const titleFontSize = 12
    const categoryFontSize = 8
    const headerFontSize = 7
    const lineHeight = 10  // Row height
    
    // Month abbreviations for date formatting
    const monthAbbr = ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC']
    
    // Format date as "DD.MMM" (e.g., "12.DEC")
    const formatDateShort = (dateStr: string): string => {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = monthAbbr[date.getMonth()]
      return `${day}.${month}`
    }
    
    // Header - Title
    const inventoryDate = new Date(inventory.date)
    const titleDate = `${inventoryDate.getDate()}.${(inventoryDate.getMonth() + 1).toString().padStart(2, '0')}`
    const headerText = removeDiacritics(`INVENTAR ${inventory.username.toUpperCase()} ${titleDate}`)
    
    doc.font(fontBold).fontSize(titleFontSize)
    doc.text(headerText, margins, margins, { align: 'left', width: availableWidth })
    doc.moveDown(0.3)
    
    // Column headers (INV / NEC) for each of the 3 columns
    const columnHeaderY = doc.y
    doc.font(fontBold).fontSize(headerFontSize)
    
    for (let col = 0; col < 3; col++) {
      const columnX = margins + col * (columnWidth + columnGap)
      // INV header - positioned over INV data area
      doc.text('INV', columnX + productNameWidth, columnHeaderY, { 
        width: invWidth, 
        align: 'center' 
      })
      // NEC header - positioned over NEC data area  
      doc.text('NEC', columnX + productNameWidth + invWidth, columnHeaderY, { 
        width: necWidth, 
        align: 'center' 
      })
    }
    doc.moveDown(0.3)
    
    const contentStartY = doc.y
    
    // Create a map of submitted entries by category and product name
    const submittedEntriesMap = new Map<string, Map<string, any>>()
    for (const entry of inventory.entries) {
      if (!submittedEntriesMap.has(entry.category)) {
        submittedEntriesMap.set(entry.category, new Map())
      }
      submittedEntriesMap.get(entry.category)!.set(entry.productName, entry)
    }
    
    // Process all categories from INVENTORY_CATEGORIES
    const categories = INVENTORY_CATEGORIES
    
    // Colors
    const categoryColor = '#c1121f' // red for category headers
    const textColor = '#000000'
    
    // Helper to draw a row
    const drawRow = (
      columnX: number, 
      rowY: number, 
      productName: string, 
      invText: string, 
      necText: string,
      showProductName: boolean = true
    ) => {
      // Product name
      if (showProductName && productName) {
        doc.font(fontRegular).fontSize(fontSize)
        doc.fillColor(textColor)
        doc.text(productName, columnX, rowY, { 
          width: productNameWidth,
          lineBreak: false
        })
      }
      
      // INV column
      doc.font(fontRegular).fontSize(fontSize)
      doc.fillColor(textColor)
      doc.text(invText, columnX + productNameWidth, rowY, {
        width: invWidth,
        align: 'left',
        lineBreak: false
      })
      
      // NEC column
      doc.font(fontBold).fontSize(fontSize)
      doc.fillColor(textColor)
      doc.text(necText, columnX + productNameWidth + invWidth, rowY, {
        width: necWidth,
        align: 'left',
        lineBreak: false
      })
    }
    
    // Track column positions
    let currentColumn = 0
    let columnX = margins
    let columnY = contentStartY
    
    // Render all categories, flowing across columns
    for (const category of categories) {
      const categoryName = category.name
      
      // Check if we need to move to next column (if category header would overflow)
      if (columnY + 50 > pageHeight - margins && currentColumn < 2) {
        currentColumn++
        columnX = margins + currentColumn * (columnWidth + columnGap)
        columnY = contentStartY
      }
      
      // Category header in RED
      doc.font(fontBold).fontSize(categoryFontSize)
      doc.fillColor(categoryColor)
      doc.text(removeDiacritics(categoryName), columnX, columnY, { 
        width: columnWidth
      })
      doc.fillColor(textColor)
      columnY += 10
      
      // Products in this category - show ALL products
      for (const productName of category.products) {
        const submittedEntry = submittedEntriesMap.get(categoryName)?.get(productName)
        const cleanProductName = removeDiacritics(productName)
        
        // Check if we need to move to next column
        if (columnY + lineHeight > pageHeight - margins && currentColumn < 2) {
          currentColumn++
          columnX = margins + currentColumn * (columnWidth + columnGap)
          columnY = contentStartY
        }
        
        if (submittedEntry) {
          // Product has submitted data
          const productEntries = Array.isArray(submittedEntry.entries) ? submittedEntry.entries : []
          const entriesWithData = productEntries.filter((e: any) => 
            (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
          )
          
          if (entriesWithData.length > 0) {
            // First row shows product name + first entry
            let isFirstRow = true
            
            for (const dataEntry of entriesWithData) {
              // Check if we need to move to next column
              if (columnY + lineHeight > pageHeight - margins && currentColumn < 2) {
                currentColumn++
                columnX = margins + currentColumn * (columnWidth + columnGap)
                columnY = contentStartY
                isFirstRow = true // Show product name again in new column
              }
              
              const hasInventar = dataEntry.quantity && dataEntry.quantity > 0
              const hasNecesar = dataEntry.requiredQuantity && dataEntry.requiredQuantity > 0
              
              // Build INV text
              let invText = ''
              if (hasInventar) {
                const dateShort = formatDateShort(dataEntry.receptionDate)
                invText = `${dateShort}  ${dataEntry.unit} ${dataEntry.quantity}`
              }
              
              // Build NEC text
              let necText = ''
              if (hasNecesar) {
                necText = `${dataEntry.requiredUnit} ${dataEntry.requiredQuantity}`
              }
              
              drawRow(
                columnX, 
                columnY, 
                cleanProductName, 
                invText, 
                necText, 
                isFirstRow
              )
              
              columnY += lineHeight
              isFirstRow = false
            }
          } else {
            // Product exists but has no data - show with empty values
            drawRow(columnX, columnY, cleanProductName, '', '', true)
            columnY += lineHeight
          }
        } else {
          // Product not submitted - show with empty values
          drawRow(columnX, columnY, cleanProductName, '', '', true)
          columnY += lineHeight
        }
      }
      
      // Also show custom products that are not in the default list
      const categorySubmittedEntries = submittedEntriesMap.get(categoryName)
      if (categorySubmittedEntries) {
        for (const [productName, entry] of categorySubmittedEntries.entries()) {
          // Check if it's a custom product (not in default list)
          if (!category.products.includes(productName)) {
            const cleanProductName = removeDiacritics(productName)
            const productEntries = Array.isArray(entry.entries) ? entry.entries : []
            const entriesWithData = productEntries.filter((e: any) => 
              (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
            )
            
            if (entriesWithData.length > 0) {
              let isFirstRow = true
              
              for (const dataEntry of entriesWithData) {
                // Check if we need to move to next column
                if (columnY + lineHeight > pageHeight - margins && currentColumn < 2) {
                  currentColumn++
                  columnX = margins + currentColumn * (columnWidth + columnGap)
                  columnY = contentStartY
                  isFirstRow = true
                }
                
                const hasInventar = dataEntry.quantity && dataEntry.quantity > 0
                const hasNecesar = dataEntry.requiredQuantity && dataEntry.requiredQuantity > 0
                
                // Build INV text
                let invText = ''
                if (hasInventar) {
                  const dateShort = formatDateShort(dataEntry.receptionDate)
                  invText = `${dateShort}  ${dataEntry.unit} ${dataEntry.quantity}`
                }
                
                // Build NEC text
                let necText = ''
                if (hasNecesar) {
                  necText = `${dataEntry.requiredUnit} ${dataEntry.requiredQuantity}`
                }
                
                drawRow(
                  columnX, 
                  columnY, 
                  cleanProductName, 
                  invText, 
                  necText, 
                  isFirstRow
                )
                
                columnY += lineHeight
                isFirstRow = false
              }
            }
          }
        }
      }
      
      columnY += 5 // Gap between categories
    }

    doc.end()

    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve())
      stream.on('error', (err) => reject(err))
    })

    console.log(`Inventory PDF generated successfully: ${filepath}`)
    return filepath
  } catch (error) {
    console.error('Error in generateInventoryPDF:', error)
    throw error
  }
}

