import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  products: string[]
}

const INVENTORY_CATEGORIES: InventoryCategory[] = [
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

async function seedInventoryProducts() {
  console.log('🌱 Seeding inventory products...')

  try {
    // Delete all existing categories and products (cascading delete will handle products)
    await prisma.inventoryProduct.deleteMany()
    await prisma.inventoryCategory.deleteMany()
    console.log('✅ Cleared existing inventory products and categories')

    // Create categories and products
    for (let i = 0; i < INVENTORY_CATEGORIES.length; i++) {
      const categoryData = INVENTORY_CATEGORIES[i]
      
      const category = await prisma.inventoryCategory.create({
        data: {
          name: categoryData.name,
          units: categoryData.units,
          defaultUnit: categoryData.defaultUnit,
          displayOrder: i,
        },
      })

      console.log(`✅ Created category: ${category.name}`)

      // Create products for this category
      for (let j = 0; j < categoryData.products.length; j++) {
        const productName = categoryData.products[j]
        
        await prisma.inventoryProduct.create({
          data: {
            categoryId: category.id,
            name: productName,
            displayOrder: j,
          },
        })
      }

      console.log(`✅ Created ${categoryData.products.length} products for ${category.name}`)
    }

    console.log('✅ Successfully seeded inventory products!')
  } catch (error) {
    console.error('❌ Error seeding inventory products:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedInventoryProducts()



