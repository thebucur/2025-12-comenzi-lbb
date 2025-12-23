import PDFDocument from 'pdfkit'
import prisma from '../lib/prisma'
import fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import path from 'path'
import https from 'https'
import sharp from 'sharp'
import crypto from 'crypto'

// Use Railway persistent volume for production, local directory for development
// Railway volume should be mounted at /app/storage
const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
const PDF_DIR = process.env.PDF_DIR || path.join(STORAGE_BASE, 'pdfs')
const FONTS_DIR = process.env.FONTS_DIR || path.join(STORAGE_BASE, 'fonts')
const MS_PER_DAY = 1000 * 60 * 60 * 24

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

const getDateHighlightColor = (dateInput?: string | Date | null): string | null => {
  if (!dateInput) return null

  const parsed = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(parsed.getTime())) return null

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  const diffDays = Math.floor((todayStart.getTime() - targetStart.getTime()) / MS_PER_DAY)

  if (diffDays === 1) return '#ffff00' // yellow for yesterday
  if (diffDays >= 2) return '#ef4444' // red for two days ago or older
  return null
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

// Helper function to generate a unique filename by appending an incremental number if needed
const getUniqueFilename = async (baseFilename: string, directory: string): Promise<string> => {
  const baseName = path.parse(baseFilename).name
  const ext = path.parse(baseFilename).ext
  let counter = 1
  let filename = baseFilename
  let filepath = path.join(directory, filename)
  
  // Check if file exists, and if so, increment counter
  while (existsSync(filepath)) {
    filename = `${baseName}-${counter}${ext}`
    filepath = path.join(directory, filename)
    counter++
  }
  
  return filename
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
  const baseFilename = `order-${order.orderNumber}.pdf`
  const filename = await getUniqueFilename(baseFilename, PDF_DIR)
  const filepath = path.join(PDF_DIR, filename)
  console.log(`PDF filename selected (order): base=${baseFilename}, final=${filename}, dir=${PDF_DIR}`)
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
  const addField = (
    label: string,
    value: string | null | undefined,
    options?: { highlightColor?: string }
  ) => {
    if (value === null || value === undefined || value === '') return
    
    const { highlightColor } = options || {}
    const cleanLabel = removeDiacritics(label)
    const cleanValue = removeDiacritics(value)

    const remainingHeight = doc.page.height - margins.bottom - doc.y
    if (remainingHeight <= 0) return // hard stop to keep single page

    const x = margins.left
    const y = doc.y

    const isRedHighlight = highlightColor?.toLowerCase() === '#ef4444'
    const labelColorForHighlight = highlightColor ? (isRedHighlight ? '#ffffff' : labelColor) : labelColor
    const valueColorForHighlight = highlightColor ? (isRedHighlight ? '#ffffff' : textColor) : textColor
    const valueFontForHighlight = highlightColor ? fontBold : fontRegular

    if (highlightColor) {
      const labelText = `${cleanLabel}: ${cleanValue}`
      const textHeight = doc.font(fontRegular).fontSize(12).heightOfString(labelText, {
        width: leftColumnWidth,
      })
      const padding = 4

      doc.save()
      doc.rect(x - padding, y - padding, leftColumnWidth + padding * 2, textHeight + padding * 2)
      doc.fillAndStroke(highlightColor, highlightColor)
      doc.restore()
    }

    doc.fillColor(labelColorForHighlight)
    doc.font(fontBold).fontSize(12).text(`${cleanLabel}: `, x, y, {
      continued: true,
      width: leftColumnWidth,
    })
    doc.fillColor(valueColorForHighlight)
    doc.font(valueFontForHighlight).fontSize(12).text(cleanValue, {
      width: leftColumnWidth,
    })
    doc.moveDown(0.3) // add a small spacer for readability
  }

  // Header
  doc.font(fontBold).fontSize(18).text(removeDiacritics(`Comanda #${order.orderNumber}`), { align: 'center' })
  doc.moveDown(0.6)

  const columnStartY = doc.y

  // Order Details
  doc.font(fontBold).fontSize(13).text(removeDiacritics('Detalii comanda:'), margins.left, doc.y, {
    underline: true,
    width: leftColumnWidth,
  })
  doc.moveDown(0.4)
  addField('Client', order.clientName)
  addField('Telefon', `07${order.phoneNumber}`)
  addField('Metodă', order.deliveryMethod === 'ridicare' ? 'Ridicare' : 'Livrare')
  addField('Locație', order.location || undefined)
  addField('Adresă', order.address || undefined)
  addField('Preia comanda', order.staffName)
  const pickupDateValue = order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('ro-RO') : undefined
  const pickupDateHighlight = getDateHighlightColor(order.pickupDate)
  addField('Data', pickupDateValue, pickupDateHighlight ? { highlightColor: pickupDateHighlight } : undefined)
  if (order.advance) addField('Avans', `${order.advance} RON`)
  doc.moveDown()

  // Cake Details
  doc.font(fontBold).fontSize(13).text(removeDiacritics('Detalii tort:'), margins.left, doc.y, {
    underline: true,
    width: leftColumnWidth,
  })
  doc.moveDown(0.4)
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
    doc.font(fontBold).fontSize(12).text(cleanValue, {
      width: leftColumnWidth,
    })
    doc.moveDown(0.3)
  }
  
  doc.moveDown(0.5)

  // Decor Details - Only show if not noCake
  if (!order.noCake) {
    doc.font(fontBold).fontSize(13).text(removeDiacritics('Detalii decor:'), margins.left, doc.y, {
      underline: true,
      width: leftColumnWidth,
    })
    doc.moveDown(0.4)
    addField('Îmbrăcat în', order.coating)
    if (order.colors.length > 0) {
      addField('Culori', order.colors.join(', '))
    }
    addField('Tip decor', order.decorType)
    addField('Detalii', order.decorDetails || undefined)
    addField('Observații', order.observations || undefined)
    doc.moveDown(0.5)
  }

  // Photos (only regular photos, exclude foaie de zahar)
  const photosToRender = regularPhotos.slice(0, 3)

  if (photosToRender.length > 0) {
    const photoColumnX = margins.left + leftColumnWidth + columnGap
    const photoLabel = removeDiacritics('Poze:')
    const photoHeadingHeight = doc
      .font(fontBold)
      .fontSize(13)
      .heightOfString(photoLabel, { width: rightColumnWidth })

    // Ensure we always start the photo column aligned with the first section
    const startY = columnStartY
    const availableHeight = doc.page.height - margins.bottom - startY
    const photoGap = 4
    const maxPhotos = photosToRender.length
    const cellHeight = Math.max((availableHeight - photoGap * (maxPhotos - 1)) / maxPhotos, 28)
    const imageMaxHeight = cellHeight

    doc.font(fontBold).fontSize(13).text(photoLabel, photoColumnX, startY, {
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
          doc.font(fontRegular).fontSize(12).text(fallbackText, photoColumnX, cellY + imageMaxHeight / 2 - 6, {
            width: rightColumnWidth,
            align: 'center',
          })
        }
      } else {
        console.log(`Image path not found, showing URL: ${photo.url}`)
        doc.font(fontRegular).fontSize(12).text(fallbackText, photoColumnX, cellY + imageMaxHeight / 2 - 6, {
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
    units: ['buc.', 'g.', 'tv'],
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
    units: ['tv', 'plt', 'rand'],
    defaultUnit: 'tv',
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
    units: ['tv', 'plt'],
    defaultUnit: 'tv',
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
    units: ['tv', 'plt', 'rand'],
    defaultUnit: 'tv',
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

// Calculate hash of the PDF generation function code
// This hash will change whenever the generation logic changes
const getPDFGenerationCodeHash = async (): Promise<string> => {
  try {
    // Read the current file content to get the actual function code
    const filePath = path.join(__dirname, 'pdf.service.ts')
    const fileContent = await fs.readFile(filePath, 'utf-8')
    
    // Extract the generateInventoryPDF function code
    // Find the function start and end
    const functionStart = fileContent.indexOf('export const generateInventoryPDF')
    if (functionStart === -1) {
      // Fallback: use a hash of the entire file
      return crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 16)
    }
    
    // Find the matching closing brace for the function
    let braceCount = 0
    let inFunction = false
    let functionEnd = functionStart
    
    for (let i = functionStart; i < fileContent.length; i++) {
      const char = fileContent[i]
      if (char === '{') {
        braceCount++
        inFunction = true
      } else if (char === '}') {
        braceCount--
        if (inFunction && braceCount === 0) {
          functionEnd = i + 1
          break
        }
      }
    }
    
    // Extract function code
    const functionCode = fileContent.substring(functionStart, functionEnd)
    
    // Return hash of the function code
    return crypto.createHash('sha256').update(functionCode).digest('hex').substring(0, 16)
  } catch (error) {
    console.error('Error calculating PDF generation code hash:', error)
    // Fallback: return a hash based on current timestamp and function signature
    // This ensures version increments even if file reading fails
    const fallbackCode = 'generateInventoryPDF' + Date.now().toString()
    return crypto.createHash('sha256').update(fallbackCode).digest('hex').substring(0, 16)
  }
}

// Check if PDF generation code has changed and increment version if needed
const checkAndUpdatePDFGenerationVersion = async (inventoryId: string): Promise<boolean> => {
  try {
    const currentHash = await getPDFGenerationCodeHash()
    
    // Get or create the hash storage in GlobalConfig
    const configKey = 'pdf_generation_code_hash'
    const existingConfig = await prisma.globalConfig.findUnique({
      where: {
        category_key: {
          category: 'system',
          key: configKey,
        },
      },
    })
    
    const lastHash = existingConfig ? (existingConfig.value as any)?.hash : null
    
    // If hash changed, increment version for this inventory
    if (lastHash && lastHash !== currentHash) {
      console.log(`PDF generation code changed (hash: ${lastHash} -> ${currentHash}), incrementing version`)
      
      // Get current inventory with version
      const currentInventory = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      }) as any
      
      if (currentInventory) {
        const newVersion = (currentInventory.version || 1) + 1
        
        await (prisma.inventory.update as any)({
          where: { id: inventoryId },
          data: { version: newVersion },
        })
      }
      
      // Update the stored hash
      if (existingConfig) {
        await prisma.globalConfig.update({
          where: { id: existingConfig.id },
          data: { value: { hash: currentHash } },
        })
      } else {
        await prisma.globalConfig.create({
          data: {
            category: 'system',
            key: configKey,
            value: { hash: currentHash },
          },
        })
      }
      
      return true // Version was incremented
    } else if (!lastHash) {
      // First time - store the hash
      await prisma.globalConfig.upsert({
        where: {
          category_key: {
            category: 'system',
            key: configKey,
          },
        },
        create: {
          category: 'system',
          key: configKey,
          value: { hash: currentHash },
        },
        update: {
          value: { hash: currentHash },
        },
      })
    }
    
    return false // Version was not incremented
  } catch (error) {
    console.error('Error checking PDF generation version:', error)
    // Don't fail PDF generation if version check fails
    return false
  }
}

export const generateInventoryPDF = async (inventory: any): Promise<string> => {
  try {
    console.log(`Starting inventory PDF generation for ${inventory.username} on ${inventory.date}`)
    
    // Check if PDF generation code changed and increment version if needed
    await checkAndUpdatePDFGenerationVersion(inventory.id)
    
    // Reload inventory to get updated version
    const updatedInventory = await prisma.inventory.findUnique({
      where: { id: inventory.id },
      include: { entries: true },
    })
    
    if (!updatedInventory) {
      throw new Error('Inventory not found after version check')
    }
    
    // Use updated inventory for PDF generation
    inventory = updatedInventory

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
    const baseFilename = `inventory-${inventory.username}-${dateStr}.pdf`
    const filename = await getUniqueFilename(baseFilename, PDF_DIR)
    const filepath = path.join(PDF_DIR, filename)
    console.log(`PDF filename selected (inventory): base=${baseFilename}, final=${filename}, dir=${PDF_DIR}`)

    // Derive display version directly from the filename so it always matches the file suffix
    // base file (no suffix) => version 1, "-1" => version 2, "-2" => version 3, etc.
    const filenameVersionMatch = filename.match(/-(\d+)\.pdf$/)
    const displayVersion = filenameVersionMatch ? parseInt(filenameVersionMatch[1], 10) + 1 : 1
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
    const lineHeight = 12  // Row height
    
    // Format date as "DD.MM" (e.g., "22.12")
    const formatDateShort = (dateStr: string): string => {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = date.getMonth() + 1 // Month is 0-indexed, so add 1
      return `${day}.${month.toString().padStart(2, '0')}`
    }
    
    // Convert unit abbreviations for PDF display
    const formatUnit = (unit: string): string => {
      if (unit === 'tava') return 'tv'
      if (unit === 'platou') return 'plt'
      return unit
    }
    
    // Header - Title (left) and Version (right)
    const inventoryDate = new Date(inventory.date)
    const titleDate = `${inventoryDate.getDate()}.${(inventoryDate.getMonth() + 1).toString().padStart(2, '0')}`
    const headerText = removeDiacritics(`INVENTAR ${inventory.username.toUpperCase()} ${titleDate}`)
    // Use the version derived from the filename to keep the label in sync with the generated file name
    const versionText = `version v${displayVersion}`
    
    // Draw title on the left
    doc.font(fontBold).fontSize(titleFontSize)
    doc.text(headerText, margins, margins, { align: 'left', width: availableWidth - 50, continued: false })
    
    // Draw version in the top right corner (much smaller font)
    const versionFontSize = 6
    doc.font(fontRegular).fontSize(versionFontSize)
    const versionWidth = doc.widthOfString(versionText)
    doc.text(versionText, pageWidth - margins - versionWidth, margins, { align: 'right' })
    
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
    
    // Draw vertical lines between columns for visual separation
    const lineColor = '#b3b3b3' // darker grey for column separators to stay visible over row highlights
    const lineStartY = contentStartY
    const lineEndY = pageHeight - margins
    
    doc.save()
    doc.strokeColor(lineColor)
    doc.lineWidth(0.5)
    
    // Draw lines for each of the 3 main columns
    for (let col = 0; col < 3; col++) {
      const columnX = margins + col * (columnWidth + columnGap)
      
      // Line between product name and INV
      const invLineX = columnX + productNameWidth
      doc.moveTo(invLineX, lineStartY)
      doc.lineTo(invLineX, lineEndY)
      doc.stroke()
      
      // Line between INV and NEC
      const necLineX = columnX + productNameWidth + invWidth
      doc.moveTo(necLineX, lineStartY)
      doc.lineTo(necLineX, lineEndY)
      doc.stroke()
    }
    
    // Line between main column 0 and column 1
    const mainLine1X = margins + columnWidth
    doc.moveTo(mainLine1X, lineStartY)
    doc.lineTo(mainLine1X, lineEndY)
    doc.stroke()
    
    // Line between main column 1 and column 2
    const mainLine2X = margins + columnWidth + columnGap + columnWidth
    doc.moveTo(mainLine2X, lineStartY)
    doc.lineTo(mainLine2X, lineEndY)
    doc.stroke()
    
    doc.restore()
    
    // Create a map of submitted entries by category and product name
    const submittedEntriesMap = new Map<string, Map<string, any>>()
    for (const entry of inventory.entries) {
      if (!submittedEntriesMap.has(entry.category)) {
        submittedEntriesMap.set(entry.category, new Map())
      }
      submittedEntriesMap.get(entry.category)!.set(entry.productName, entry)
    }
    
    // Fetch categories from database, sorted by displayOrder
    // TypeScript may not recognize the model, but it exists at runtime
    const dbCategories = await (prisma as any).inventoryCategory.findMany({
      include: {
        products: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    }) as Array<{
      id: string
      name: string
      units: string[]
      defaultUnit: string
      products: Array<{ name: string }>
    }>
    
    // Convert database categories to the format expected by PDF generation
    // Use database categories if available, otherwise fall back to hardcoded ones
    const categories = dbCategories.length > 0 
      ? dbCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          units: cat.units,
          defaultUnit: cat.defaultUnit,
          products: cat.products.map((p) => p.name),
        }))
      : INVENTORY_CATEGORIES
    
    // Colors
    const categoryColor = '#c1121f' // red for category headers
    const textColor = '#000000'
    
    // Helper to draw a horizontal line between rows
    const drawRowSeparator = (columnX: number, rowY: number) => {
      doc.save()
      doc.strokeColor('#d3d3d3') // light grey color
      doc.lineWidth(0.3) // thin line
      doc.moveTo(columnX, rowY + lineHeight)
      doc.lineTo(columnX + columnWidth, rowY + lineHeight)
      doc.stroke()
      doc.restore()
    }
    
    // Helper to draw a row
    const drawRow = (
      columnX: number, 
      rowY: number, 
      productName: string, 
      invText: string, 
      necText: string,
      showProductName: boolean = true,
      rowIndex: number = 0,
      dateHighlight?: string | null
    ) => {
      // Draw date highlight if specified
      if (dateHighlight) {
        doc.save()
        doc.rect(columnX + productNameWidth, rowY, invWidth, lineHeight)
        doc.fillAndStroke(dateHighlight, dateHighlight)
        doc.restore()
      }
      
      // Calculate vertical centering offset
      // Center text vertically within the lineHeight cell
      const textVerticalOffset = (lineHeight - fontSize) / 2
      const textY = rowY + textVerticalOffset
      
      // Product name
      if (showProductName && productName) {
        doc.font(fontRegular).fontSize(fontSize)
        doc.fillColor(textColor)
        doc.text(productName, columnX, textY, { 
          width: productNameWidth,
          lineBreak: false
        })
      }
      
      // INV column - centered to match header
      const isRedHighlight = dateHighlight?.toLowerCase() === '#ef4444'
      const invTextColor = dateHighlight ? (isRedHighlight ? '#FFFFFF' : textColor) : textColor
      const invFont = dateHighlight ? fontBold : fontRegular
      doc.font(invFont).fontSize(fontSize)
      doc.fillColor(invTextColor)
      doc.text(invText, columnX + productNameWidth, textY, {
        width: invWidth,
        align: 'center',
        lineBreak: false
      })
      
      // NEC column - centered to match header
      doc.font(fontBold).fontSize(fontSize)
      doc.fillColor(textColor)
      doc.text(necText, columnX + productNameWidth + invWidth, textY, {
        width: necWidth,
        align: 'center',
        lineBreak: false
      })
      
      // Draw horizontal line at the bottom of the row
      drawRowSeparator(columnX, rowY)
    }
    
    // Track column positions and row indices
    let currentColumn = 0
    let columnX = margins
    let columnY = contentStartY
    let rowIndex = 0 // Track row index for zebra striping (resets per column)
    
    // Render all categories, flowing across columns
    for (const category of categories) {
      const categoryName = category.name
      
      // Check if we need to move to next column (if category header would overflow)
      if (columnY + 50 > pageHeight - margins && currentColumn < 2) {
        currentColumn++
        columnX = margins + currentColumn * (columnWidth + columnGap)
        columnY = contentStartY
        rowIndex = 0 // Reset row index when moving to new column
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
          rowIndex = 0 // Reset row index when moving to new column
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
                rowIndex = 0 // Reset row index when moving to new column
                isFirstRow = true // Show product name again in new column
              }
              
              const hasInventar = dataEntry.quantity && dataEntry.quantity > 0
              const hasNecesar = dataEntry.requiredQuantity && dataEntry.requiredQuantity > 0
              
              // Build INV text and get date highlight
              let invText = ''
              let dateHighlight: string | null = null
              if (hasInventar) {
                const dateShort = formatDateShort(dataEntry.receptionDate)
                invText = `${dateShort}  ${dataEntry.quantity} ${formatUnit(dataEntry.unit)}`
                dateHighlight = getDateHighlightColor(dataEntry.receptionDate)
              }
              
              // Build NEC text
              let necText = ''
              if (hasNecesar) {
                necText = `${dataEntry.requiredQuantity} ${formatUnit(dataEntry.requiredUnit)}`
              }
              
              drawRow(
                columnX, 
                columnY, 
                cleanProductName, 
                invText, 
                necText, 
                isFirstRow,
                rowIndex,
                dateHighlight
              )
              
              columnY += lineHeight
              rowIndex++ // Increment row index for zebra striping
              isFirstRow = false
            }
          } else {
            // Product exists but has no data - show with empty values
            drawRow(columnX, columnY, cleanProductName, '', '', true, rowIndex)
            columnY += lineHeight
            rowIndex++ // Increment row index for zebra striping
          }
        } else {
          // Product not submitted - show with empty values
          drawRow(columnX, columnY, cleanProductName, '', '', true, rowIndex)
          columnY += lineHeight
          rowIndex++ // Increment row index for zebra striping
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
                  rowIndex = 0 // Reset row index when moving to new column
                  isFirstRow = true
                }
                
                const hasInventar = dataEntry.quantity && dataEntry.quantity > 0
                const hasNecesar = dataEntry.requiredQuantity && dataEntry.requiredQuantity > 0
                
                // Build INV text and get date highlight
                let invText = ''
                let dateHighlight: string | null = null
                if (hasInventar) {
                  const dateShort = formatDateShort(dataEntry.receptionDate)
                  invText = `${dateShort}  ${dataEntry.quantity} ${formatUnit(dataEntry.unit)}`
                  dateHighlight = getDateHighlightColor(dataEntry.receptionDate)
                }
                
                // Build NEC text
                let necText = ''
                if (hasNecesar) {
                  necText = `${dataEntry.requiredQuantity} ${formatUnit(dataEntry.requiredUnit)}`
                }
                
                drawRow(
                  columnX, 
                  columnY, 
                  cleanProductName, 
                  invText, 
                  necText, 
                  isFirstRow,
                  rowIndex,
                  dateHighlight
                )
                
                columnY += lineHeight
                rowIndex++ // Increment row index for zebra striping
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

