import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import * as fs from 'fs'

// Get all categories with their products
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    // #region agent log
    fs.appendFileSync('d:\\Dropbox\\CURSOR\\2025 12 COMENZI LBB\\.cursor\\debug.log', JSON.stringify({location:'inventory-products.controller.ts:7',message:'getAllCategories called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})+'\n');
    // #endregion
    const categories = await prisma.inventoryCategory.findMany({
      include: {
        products: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })
    // #region agent log
    fs.appendFileSync('d:\\Dropbox\\CURSOR\\2025 12 COMENZI LBB\\.cursor\\debug.log', JSON.stringify({location:'inventory-products.controller.ts:17',message:'Categories fetched from DB',data:{categoriesCount:categories.length,firstCategory:categories[0]?.name,firstCategoryProductsCount:categories[0]?.products?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})+'\n');
    // #endregion
    res.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    // #region agent log
    fs.appendFileSync('d:\\Dropbox\\CURSOR\\2025 12 COMENZI LBB\\.cursor\\debug.log', JSON.stringify({location:'inventory-products.controller.ts:23',message:'Error fetching categories',data:{errorMessage:(error as any)?.message,errorCode:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})+'\n');
    // #endregion
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
}

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, units, defaultUnit, displayOrder } = req.body

    if (!name || !units || !Array.isArray(units) || units.length === 0 || !defaultUnit) {
      return res.status(400).json({ error: 'Name, units array, and defaultUnit are required' })
    }

    if (!units.includes(defaultUnit)) {
      return res.status(400).json({ error: 'Default unit must be in the units array' })
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        name,
        units,
        defaultUnit,
        displayOrder: displayOrder || 0,
      },
      include: {
        products: true,
      },
    })

    res.json(category)
  } catch (error: any) {
    console.error('Error creating category:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A category with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to create category' })
  }
}

// Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, units, defaultUnit, displayOrder } = req.body

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (units !== undefined) {
      if (!Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ error: 'Units must be a non-empty array' })
      }
      updateData.units = units
    }
    if (defaultUnit !== undefined) {
      const finalUnits = units || (await prisma.inventoryCategory.findUnique({ where: { id } }))?.units
      if (finalUnits && !finalUnits.includes(defaultUnit)) {
        return res.status(400).json({ error: 'Default unit must be in the units array' })
      }
      updateData.defaultUnit = defaultUnit
    }
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder

    const category = await prisma.inventoryCategory.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    res.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A category with this name already exists' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.status(500).json({ error: 'Failed to update category' })
  }
}

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.inventoryCategory.delete({
      where: { id },
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.status(500).json({ error: 'Failed to delete category' })
  }
}

// Create a product in a category
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { categoryId, name, displayOrder } = req.body

    if (!categoryId || !name) {
      return res.status(400).json({ error: 'Category ID and name are required' })
    }

    const product = await prisma.inventoryProduct.create({
      data: {
        categoryId,
        name,
        displayOrder: displayOrder || 0,
      },
    })

    res.json(product)
  } catch (error: any) {
    console.error('Error creating product:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this name already exists in this category' })
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
}

// Update a product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, displayOrder } = req.body

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder

    const product = await prisma.inventoryProduct.update({
      where: { id },
      data: updateData,
    })

    res.json(product)
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this name already exists in this category' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to update product' })
  }
}

// Delete a product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.inventoryProduct.delete({
      where: { id },
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to delete product' })
  }
}

// Reorder categories
export const reorderCategories = async (req: Request, res: Response) => {
  try {
    const { categoryIds } = req.body // Array of category IDs in desired order

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ error: 'categoryIds must be an array' })
    }

    // Update each category's displayOrder
    await Promise.all(
      categoryIds.map((id, index) =>
        prisma.inventoryCategory.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    res.status(500).json({ error: 'Failed to reorder categories' })
  }
}

// Reorder products within a category
export const reorderProducts = async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body // Array of product IDs in desired order

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds must be an array' })
    }

    // Update each product's displayOrder
    await Promise.all(
      productIds.map((id, index) =>
        prisma.inventoryProduct.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error reordering products:', error)
    res.status(500).json({ error: 'Failed to reorder products' })
  }
}

