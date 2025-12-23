import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderCategories,
  reorderProducts,
} from '../controllers/inventory-products.controller'

const router = Router()

// Public route for getting categories (used by inventory form)
router.get('/categories/public', getAllCategories)

// Protect all other routes with authentication (admin only in practice)
router.use(authenticate)

// Category routes (authenticated - for admin)
router.get('/categories', getAllCategories)
router.post('/categories', createCategory)
router.put('/categories/:id', updateCategory)
router.delete('/categories/:id', deleteCategory)
router.post('/categories/reorder', reorderCategories)

// Product routes
router.post('/products', createProduct)
router.put('/products/:id', updateProduct)
router.delete('/products/:id', deleteProduct)
router.post('/products/reorder', reorderProducts)

export default router

