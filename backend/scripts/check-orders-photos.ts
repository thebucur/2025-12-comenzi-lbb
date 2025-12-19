import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function checkOrdersPhotos(orderNumbers: number[]) {
  try {
    console.log('🔍 Checking orders photos...\n')

    const orders = await prisma.order.findMany({
      where: {
        orderNumber: { in: orderNumbers },
      },
      include: {
        photos: true,
      },
    })

    for (const order of orders) {
      console.log(`\n📦 Order ${order.orderNumber} (ID: ${order.id})`)
      console.log(`   Total photos: ${order.photos.length}`)
      
      const foaieDeZaharPhotos = order.photos.filter(p => p.isFoaieDeZahar === true)
      console.log(`   Foaie de zahar photos: ${foaieDeZaharPhotos.length}`)
      
      for (const photo of foaieDeZaharPhotos) {
        console.log(`\n   📷 Photo ${photo.id}:`)
        console.log(`      URL: ${photo.url}`)
        console.log(`      Path: ${photo.path || '(not set)'}`)
        console.log(`      isFoaieDeZahar: ${photo.isFoaieDeZahar}`)
        
        if (photo.path) {
          const exists = fs.existsSync(photo.path)
          console.log(`      File exists (relative): ${exists}`)
          
          if (!exists) {
            // Try absolute path
            const absolutePath = path.isAbsolute(photo.path)
              ? photo.path
              : path.join(process.cwd(), photo.path)
            const absoluteExists = fs.existsSync(absolutePath)
            console.log(`      File exists (absolute: ${absolutePath}): ${absoluteExists}`)
            
            // Also check if it's in uploads directory
            const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
            const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STORAGE_BASE, 'uploads')
            const uploadsPath = path.join(UPLOAD_DIR, path.basename(photo.path))
            const uploadsExists = fs.existsSync(uploadsPath)
            console.log(`      File exists (uploads: ${uploadsPath}): ${uploadsExists}`)
          }
        }
      }
      
      // Also check photos with foaie-de-zahar in filename
      const photosWithName = order.photos.filter(p => 
        p.path?.toLowerCase().includes('foaie-de-zahar') ||
        p.url?.toLowerCase().includes('foaie-de-zahar')
      )
      
      if (photosWithName.length > 0 && photosWithName.length !== foaieDeZaharPhotos.length) {
        console.log(`\n   ⚠️  Found ${photosWithName.length} photo(s) with "foaie-de-zahar" in filename but flag not set:`)
        for (const photo of photosWithName) {
          if (!photo.isFoaieDeZahar) {
            console.log(`      - Photo ${photo.id}: ${photo.path || photo.url}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

const orderNumbers = process.argv.slice(2).map(arg => parseInt(arg)).filter(n => !isNaN(n))

if (orderNumbers.length === 0) {
  console.error('Usage: tsx check-orders-photos.ts <orderNumber1> <orderNumber2> ...')
  process.exit(1)
}

checkOrdersPhotos(orderNumbers)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })


