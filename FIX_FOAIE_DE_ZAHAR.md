# Fix Foaie de Zahar for Orders 21 and 22

## Problem
Orders 21 and 22 return 404 errors when trying to download "foaie de zahar" files. This is because the photos don't have the `isFoaieDeZahar` flag set to `true` in the database.

## Solution
Two approaches have been implemented:

### 1. Enhanced Download Function (Requires Deployment)
The `downloadFoaieDeZahar` function now:
- First checks for photos with `isFoaieDeZahar === true`
- Falls back to checking filename patterns (photos with "foaie-de-zahar" in path/URL)
- Provides better error logging

**Status**: Code is ready but needs to be deployed to Railway.

### 2. Database Fix Script (Works Immediately)
A Prisma script that directly updates the database to set the `isFoaieDeZahar` flag on photos with matching filenames.

## How to Run the Fix

### Option A: Using Database Script (Recommended - Works Now)

1. **Get your Railway DATABASE_URL**:
   - Go to Railway dashboard: https://railway.com/project/8f82c3a3-1b61-4f99-888c-a8c4da960d85
   - Click on your PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Run the fix script**:
   ```powershell
   cd "d:\Dropbox\CURSOR\2025 12 COMENZI LBB"
   .\run-fix-database.ps1 -OrderNumbers @(21,22) -DatabaseUrl "YOUR_DATABASE_URL"
   ```

   Or run interactively (it will prompt for DATABASE_URL):
   ```powershell
   .\run-fix-database.ps1 -OrderNumbers @(21,22)
   ```

3. **To fix ALL orders**:
   ```powershell
   .\run-fix-database.ps1 -DatabaseUrl "YOUR_DATABASE_URL"
   ```

### Option B: Using API Endpoint (After Deployment)

1. **Deploy the code changes to Railway**:
   ```powershell
   git add .
   git commit -m "Fix foaie de zahar download with fallback and add fix endpoint"
   git push
   ```

2. **Wait for Railway to deploy** (check Railway dashboard)

3. **Run the API fix script**:
   ```powershell
   .\fix-foaie-de-zahar.ps1 -BackendUrl "https://nodejs-production-87d3.up.railway.app" -AdminUsername "admin" -OrderNumbers @(21,22)
   ```

## Files Changed

1. **backend/src/controllers/admin.controller.ts**
   - Enhanced `downloadFoaieDeZahar` with filename pattern fallback
   - Added `fixFoaieDeZaharFlags` function

2. **backend/src/routes/admin.routes.ts**
   - Added route: `POST /api/admin/fix-foaie-de-zahar-flags`

3. **backend/scripts/fix-foaie-de-zahar.ts**
   - Direct database fix script using Prisma

4. **run-fix-database.ps1**
   - PowerShell script to run the database fix

5. **fix-foaie-de-zahar.ps1**
   - PowerShell script to call the API endpoint (after deployment)

## Verification

After running the fix, try downloading the foaie de zahar files for orders 21 and 22 from the admin dashboard. They should now work correctly.

## Notes

- The database fix script works immediately and doesn't require code deployment
- The enhanced download function will work for future orders even if the flag isn't set
- Both approaches are safe and only update photos that have "foaie-de-zahar" in their filename




