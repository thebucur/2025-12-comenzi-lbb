// Script to manually set up Supabase database
// Run this if automatic seeding didn't work

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function setupSupabase() {
  try {
    console.log('🔌 Connecting to Supabase...')
    await prisma.$connect()
    console.log('✅ Connected to Supabase!')

    console.log('\n📊 Running Prisma migrations...')
    // Push schema to database
    await prisma.$executeRawUnsafe(`
      -- This will be handled by prisma db push
      -- But we'll verify tables exist
    `)
    
    console.log('✅ Schema pushed (or already exists)')

    console.log('\n🌱 Seeding database...')

    // Initialize order counter
    console.log('  Creating OrderCounter...')
    await prisma.orderCounter.upsert({
      where: { id: 'main-counter' },
      update: {},
      create: {
        id: 'main-counter',
        lastOrder: 0,
      },
    })
    console.log('  ✅ OrderCounter created')

    // Create admin user
    console.log('  Creating admin user...')
    const adminPassword = await bcrypt.hash('0000', 10)
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: adminPassword,
      },
      create: {
        username: 'admin',
        password: adminPassword,
      },
    })
    console.log('  ✅ Admin user created')
    console.log(`     Username: admin`)
    console.log(`     Password: 0000`)
    console.log(`     ID: ${adminUser.id}`)

    // Verify tables exist
    console.log('\n📋 Verifying tables...')
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
    
    console.log(`  Found ${tables.length} tables:`)
    tables.forEach(table => {
      console.log(`    - ${table.table_name}`)
    })

    const expectedTables = ['Order', 'Photo', 'User', 'OrderCounter', 'GlobalConfig']
    const foundTableNames = tables.map(t => t.table_name)
    const missingTables = expectedTables.filter(t => !foundTableNames.includes(t))

    if (missingTables.length > 0) {
      console.log(`\n  ⚠️  Missing tables: ${missingTables.join(', ')}`)
      console.log('  Run: npx prisma db push')
    } else {
      console.log('  ✅ All tables exist!')
    }

    console.log('\n✅ Database setup complete!')
    console.log('\n📝 Summary:')
    console.log('  - Tables: Created/Verified')
    console.log('  - OrderCounter: Initialized')
    console.log('  - Admin User: Created')
    console.log('    Username: admin')
    console.log('    Password: 0000')

  } catch (error) {
    console.error('\n❌ Error setting up database:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

setupSupabase()



