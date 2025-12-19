import prisma from '../src/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

// Use Railway persistent volume for production, local directory for development
const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STORAGE_BASE, 'uploads')
const PDF_DIR = process.env.PDF_DIR || path.join(STORAGE_BASE, 'pdfs')

async function deleteAllOrders() {
  try {
    console.log('🗑️  Starting deletion of all orders, photos, and files...\n')

    // Step 1: Get all orders with their photos and PDF paths
    console.log('📋 Fetching all orders...')
    const orders = await prisma.order.findMany({
      include: {
        photos: true,
      },
    })

    console.log(`   Found ${orders.length} orders\n`)

    // Step 2: Collect all file paths to delete
    const filesToDelete: string[] = []

    for (const order of orders) {
      // Add PDF path if exists
      if (order.pdfPath) {
        filesToDelete.push(order.pdfPath)
        console.log(`   📄 PDF: ${order.pdfPath}`)
      }

      // Add photo paths if they exist
      for (const photo of order.photos) {
        if (photo.path) {
          filesToDelete.push(photo.path)
          console.log(`   📸 Photo: ${photo.path}`)
        }
      }
    }

    console.log(`\n   Total files to delete: ${filesToDelete.length}\n`)

    // Step 3: Delete files from disk
    console.log('🗂️  Deleting files from disk...')
    let deletedCount = 0
    let failedCount = 0

    for (const filePath of filesToDelete) {
      try {
        // Check if file exists
        try {
          await fs.access(filePath)
          await fs.unlink(filePath)
          deletedCount++
          console.log(`   ✅ Deleted: ${filePath}`)
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            console.log(`   ⚠️  File not found (already deleted?): ${filePath}`)
          } else {
            throw error
          }
        }
      } catch (error) {
        failedCount++
        console.error(`   ❌ Failed to delete: ${filePath}`, error)
      }
    }

    console.log(`\n   Files deleted: ${deletedCount}`)
    if (failedCount > 0) {
      console.log(`   Files failed: ${failedCount}`)
    }

    // Step 4: Delete all orders from database (photos will be deleted automatically due to cascade)
    console.log('\n🗄️  Deleting orders from database...')
    const deleteResult = await prisma.order.deleteMany({})
    console.log(`   ✅ Deleted ${deleteResult.count} orders from database`)
    console.log(`   ℹ️  Photos were automatically deleted due to cascade relationship\n`)

    // Step 5: Reset order counter (optional)
    console.log('🔄 Resetting order counter...')
    await prisma.orderCounter.updateMany({
      where: {},
      data: {
        lastOrder: 0,
      },
    })
    console.log('   ✅ Order counter reset to 0\n')

    // Step 6: Clean up empty directories (optional)
    console.log('🧹 Cleaning up empty directories...')
    try {
      const uploadFiles = await fs.readdir(UPLOAD_DIR).catch(() => [])
      const pdfFiles = await fs.readdir(PDF_DIR).catch(() => [])

      if (uploadFiles.length === 0) {
        console.log(`   ℹ️  Uploads directory is empty: ${UPLOAD_DIR}`)
      } else {
        console.log(`   ⚠️  Uploads directory still contains ${uploadFiles.length} files`)
      }

      if (pdfFiles.length === 0) {
        console.log(`   ℹ️  PDFs directory is empty: ${PDF_DIR}`)
      } else {
        console.log(`   ⚠️  PDFs directory still contains ${pdfFiles.length} files`)
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check directories: ${error}`)
    }

    console.log('\n✅ All orders, photos, and files have been deleted successfully!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Orders deleted: ${orders.length}`)
    console.log(`   - Files deleted from disk: ${deletedCount}`)
    console.log(`   - Files failed to delete: ${failedCount}`)
    console.log(`   - Order counter reset to 0`)

  } catch (error) {
    console.error('\n❌ Error deleting orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
deleteAllOrders()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

