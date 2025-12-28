# Quick Setup for Inventory Products Feature

## The 500 error is because the database tables don't exist yet!

Follow these steps in order:

### 1. Stop the Backend Server
If your backend is running, stop it first (Ctrl+C in the terminal).

### 2. Generate Prisma Client
```powershell
cd backend
npx prisma generate
```

### 3. Apply the Migration
```powershell
npx prisma migrate deploy
```

If that fails, try:
```powershell
npx prisma db push
```

### 4. Seed the Data
```powershell
npx ts-node scripts/seed-inventory-products.ts
```

### 5. Start Backend Again
```powershell
npm run dev
```

### 6. Refresh Your Browser
Go back to the admin dashboard and click on "📦 Produse Inventar" again.

---

## Alternative: Quick Reset (if you don't mind losing data)

If you want to start fresh:

```powershell
cd backend
npx prisma migrate reset --force
npx ts-node scripts/seed-inventory-products.ts
npm run dev
```

**WARNING:** This will delete all data in your database!


