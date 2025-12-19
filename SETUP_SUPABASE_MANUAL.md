# Manual Supabase Setup - Step by Step

## Problem: Nothing Created in Supabase

If the automatic seeding didn't work, follow these steps to manually set up your Supabase database.

---

## Step 1: Verify DATABASE_URL in Railway

1. Go to Railway dashboard
2. Click on **nodejs** service (your backend)
3. Go to **"Variables"** tab
4. Find `DATABASE_URL`
5. **Verify it's set to your Supabase connection string**

**Should look like:**
```
postgresql://postgres.nskvbjrtajbolkluakdl:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**⚠️ Important:**
- Replace `YOUR_PASSWORD` with your actual Supabase database password
- Make sure there are no extra spaces or quotes
- The connection string should start with `postgresql://`

---

## Step 2: Run Migrations Locally

Run this from your local machine to create tables in Supabase:

### Option A: Using PowerShell (Windows)

```powershell
# Navigate to backend directory
cd "d:\Dropbox\CURSOR\2025 12 COMENZI LBB\backend"

# Set DATABASE_URL (replace with your actual Supabase connection string)
$env:DATABASE_URL="postgresql://postgres.nskvbjrtajbolkluakdl:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Run Prisma migrations
npx prisma db push

# Seed the database
npx tsx scripts/setup-supabase.ts
```

### Option B: Create .env file

1. Create `.env` file in `backend` directory:
   ```env
   DATABASE_URL=postgresql://postgres.nskvbjrtajbolkluakdl:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

2. Run commands:
   ```bash
   cd backend
   npx prisma db push
   npx tsx scripts/setup-supabase.ts
   ```

---

## Step 3: Verify in Supabase Dashboard

1. Go to Supabase dashboard
2. Click **"Database"** in left sidebar
3. Click **"Tables"** tab
4. You should see:
   - ✅ `Order`
   - ✅ `Photo`
   - ✅ `User`
   - ✅ `OrderCounter`
   - ✅ `GlobalConfig`

5. Click on **"User"** table
6. Click **"View data"** or **"Browse"**
7. You should see 1 row with `username: 'admin'`

---

## Step 4: Check Railway Logs

After running migrations locally:

1. Go to Railway dashboard
2. Click **nodejs** service
3. Go to **"Deployments"** tab
4. Click latest deployment
5. View logs

**Should see:**
```
✅ Database connection established
✅ Database seeded successfully!
✅ Admin user verified: username=admin, password=0000
🚀 Server running on http://0.0.0.0:5000
```

---

## Troubleshooting

### Error: "Can't reach database server"

**Solution:**
1. Check Supabase project is running (not paused)
2. Verify DATABASE_URL is correct
3. Make sure password is correct (no spaces, special characters encoded)
4. Try using port `5432` instead of `6543` (direct connection vs pooler)

### Error: "relation does not exist"

**Solution:**
- Run `npx prisma db push` first
- This creates all tables

### Error: "password authentication failed"

**Solution:**
- Double-check your Supabase database password
- Make sure you're using the password you set when creating the project
- Reset password in Supabase if needed: Settings → Database → Reset database password

### Error: "connection timeout"

**Solution:**
- Check your internet connection
- Try using the direct connection (port 5432) instead of pooler (port 6543)
- Check Supabase project status (might be paused)

---

## Alternative: Use Supabase SQL Editor

If command line doesn't work, you can run SQL directly:

1. Go to Supabase dashboard
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**
4. **BUT:** You still need to run Prisma migrations first to create the schema
5. The SQL editor is mainly for verifying data, not creating schema

**Better to use Prisma migrations** - they handle all the relationships and constraints correctly.

---

## Quick Test

After setup, test the connection:

```bash
# In backend directory
npx prisma studio
```

This opens a GUI to browse your database. You should see all tables and the admin user.

---

## What Should Be Created

After successful setup:

1. **5 Tables:**
   - `Order` - Cake orders
   - `Photo` - Order photos
   - `User` - Admin users
   - `OrderCounter` - Order number counter
   - `GlobalConfig` - Configuration options

2. **1 Admin User:**
   - Username: `admin`
   - Password: `0000` (hashed with bcrypt)

3. **1 Order Counter:**
   - ID: `main-counter`
   - Last Order: `0`

---

## Next Steps

Once database is set up:

1. ✅ Test admin login in your app
2. ✅ Create a test order
3. ✅ Upload test photos
4. ✅ Verify everything works

---

**Need help?** Check Railway logs for specific error messages and share them!

