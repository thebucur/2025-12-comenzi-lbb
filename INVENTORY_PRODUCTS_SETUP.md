# Inventory Products Management Setup

This guide explains how to set up and use the new Inventory Products Management feature in the admin dashboard.

## Overview

The new feature allows admins to:
- ✅ Create, edit, and delete product categories
- ✅ Set available measuring units for each category
- ✅ Add, edit, and delete products within categories
- ✅ Manage product names and organization

## Setup Instructions

### 1. Run Database Migration

First, apply the database migration to create the new tables:

```powershell
cd backend
npx prisma migrate deploy
```

Or if you're in development:

```powershell
cd backend
npx prisma migrate dev
```

### 2. Seed Initial Data

Run the seed script to populate the database with the initial categories and products:

```powershell
cd backend
npx ts-node scripts/seed-inventory-products.ts
```

This will create all the predefined categories and products from the original `inventoryProducts.ts` file.

### 3. Generate Prisma Client

Make sure the Prisma client is updated:

```powershell
cd backend
npx prisma generate
```

### 4. Restart Backend Server

Restart the backend server to load the new routes:

```powershell
cd backend
npm run dev
```

## Using the Feature

### Access the Admin Panel

1. Navigate to the admin dashboard
2. Log in with admin credentials
3. Click on the **📦 Produse Inventar** tab

### Managing Categories

**Add a Category:**
1. Click "Adaugă categorie"
2. Enter the category name (e.g., "PRODUSE LA BUCATA")
3. Add measuring units (e.g., "buc.", "kg", "tv")
4. Select a default unit
5. Click "Salvează"

**Edit a Category:**
1. Click the ✏️ button next to the category
2. Modify the name, units, or default unit
3. Click "Salvează"

**Delete a Category:**
1. Click the 🗑️ button next to the category
2. Confirm the deletion (all products in the category will also be deleted)

### Managing Products

**Add a Product:**
1. Expand a category by clicking on it
2. Click "Adaugă produs"
3. Enter the product name
4. Click "Salvează"

**Edit a Product:**
1. Hover over a product in the list
2. Click the ✏️ button
3. Modify the product name
4. Click "Salvează"

**Delete a Product:**
1. Hover over a product in the list
2. Click the ✕ button
3. Confirm the deletion

## Database Schema

### InventoryCategory Table
- `id`: Unique identifier
- `name`: Category name (unique)
- `units`: Array of available measuring units
- `defaultUnit`: Default measuring unit for this category
- `displayOrder`: Order for sorting categories
- `createdAt`, `updatedAt`: Timestamps

### InventoryProduct Table
- `id`: Unique identifier
- `categoryId`: Foreign key to InventoryCategory
- `name`: Product name (unique within category)
- `displayOrder`: Order for sorting products within category
- `createdAt`, `updatedAt`: Timestamps

## API Endpoints

All endpoints require authentication.

### Categories
- `GET /api/inventory-products/categories` - Get all categories with products
- `POST /api/inventory-products/categories` - Create a new category
- `PUT /api/inventory-products/categories/:id` - Update a category
- `DELETE /api/inventory-products/categories/:id` - Delete a category
- `POST /api/inventory-products/categories/reorder` - Reorder categories

### Products
- `POST /api/inventory-products/products` - Create a new product
- `PUT /api/inventory-products/products/:id` - Update a product
- `DELETE /api/inventory-products/products/:id` - Delete a product
- `POST /api/inventory-products/products/reorder` - Reorder products

## Features

### Category Management
- Create custom categories with any name
- Define multiple measuring units per category
- Set a default unit for each category
- Edit or delete categories
- Categories are sorted by display order

### Product Management
- Add unlimited products to any category
- Edit product names
- Delete products
- Products are sorted by display order within their category
- Product names must be unique within a category

### User Interface
- Clean, modern neumorphic design matching the existing admin dashboard
- Expandable/collapsible category views
- Modal dialogs for creating and editing
- Hover effects for better UX
- Confirmation dialogs for destructive actions
- Real-time updates after changes

## Notes

- Categories and their products are independent from the inventory submission system
- This data is used as the master list for available products
- The inventory submission feature (in the Wizard) can reference these products
- All changes are immediately reflected in the admin panel
- Delete operations are cascading (deleting a category deletes all its products)

## Troubleshooting

**Migration fails:**
- Make sure your database is running
- Check DATABASE_URL in your .env file
- Try running `npx prisma migrate reset` (WARNING: this will delete all data)

**Seed script fails:**
- Make sure the migration has been applied first
- Check that the database connection is working
- Review error messages for specific issues

**Changes not showing:**
- Refresh the page
- Check browser console for errors
- Verify the backend server is running
- Check network tab for failed API calls

## Future Enhancements

Possible improvements:
- Drag-and-drop reordering for categories and products
- Bulk import/export of products
- Product images or icons
- Search and filter functionality
- Product categorization within categories (subcategories)
- Product metadata (description, SKU, etc.)



