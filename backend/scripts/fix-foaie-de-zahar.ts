import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFoaieDeZaharFlags(orderNumbers?: number[]) {
  try {
    console.log('🔍 Starting foaie de zahar fix...\n')

    // Build where clause
    const whereClause: any = {}
    if (orderNumbers && orderNumbers.length > 0) {
      whereClause.orderNumber = { in: orderNumbers }
      console.log(`📋 Fixing orders: ${orderNumbers.join(', ')}\n`)
    } else {
      console.log('📋 Fixing ALL orders\n')
    }

    // Find all orders (or specific orders)
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        photos: true,
      },
    })

    console.log(`Found ${orders.length} order(s) to check\n`)

    let fixedCount = 0
    const results: any[] = []

    for (const order of orders) {
      console.log(`Checking order ${order.orderNumber} (${order.photos.length} photos)...`)
      
      for (const photo of order.photos) {
        // Check if photo has "foaie-de-zahar" in filename but flag is not set
        const hasFoaieDeZaharInName = 
          photo.path?.toLowerCase().includes('foaie-de-zahar') ||
          photo.url?.toLowerCase().includes('foaie-de-zahar')
        
        const isFlagSet = photo.isFoaieDeZahar === true

        if (hasFoaieDeZaharInName && !isFlagSet) {
          try {
            await prisma.photo.update({
              where: { id: photo.id },
              data: { isFoaieDeZahar: true },
            })
            fixedCount++
            results.push({
              orderNumber: order.orderNumber,
              orderId: order.id,
              photoId: photo.id,
              action: 'fixed',
            })
            console.log(`  ✅ Fixed photo ${photo.id} (path: ${photo.path || photo.url})`)
          } catch (error) {
            console.error(`  ❌ Error fixing photo ${photo.id}:`, error)
            results.push({
              orderNumber: order.orderNumber,
              orderId: order.id,
              photoId: photo.id,
              action: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        } else if (hasFoaieDeZaharInName && isFlagSet) {
          console.log(`  ℹ️  Photo ${photo.id} already has flag set`)
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} photo(s) across ${orders.length} order(s)`)
    
    if (results.length > 0) {
      console.log('\n📊 Results:')
      const resultsByOrder = results.reduce((acc, r) => {
        if (!acc[r.orderNumber]) {
          acc[r.orderNumber] = { fixed: 0, errors: 0 }
        }
        if (r.action === 'fixed') acc[r.orderNumber].fixed++
        if (r.action === 'error') acc[r.orderNumber].errors++
        return acc
      }, {} as Record<number, { fixed: number; errors: number }>)
      
      for (const [orderNum, stats] of Object.entries(resultsByOrder)) {
        console.log(`  Order ${orderNum}: ${stats.fixed} fixed, ${stats.errors} errors`)
      }
    }

    return { fixedCount, totalOrdersChecked: orders.length, results }
  } catch (error) {
    console.error('❌ Error fixing foaie de zahar flags:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Get order numbers from command line arguments
const orderNumbers = process.argv.slice(2).map(arg => {
  const num = parseInt(arg)
  if (isNaN(num)) {
    console.error(`⚠️  Invalid order number: ${arg}, skipping`)
    return null
  }
  return num
}).filter((num): num is number => num !== null)

// Run the fix
fixFoaieDeZaharFlags(orderNumbers.length > 0 ? orderNumbers : undefined)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })




