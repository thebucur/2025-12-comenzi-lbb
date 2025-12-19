# Supabase Database Setup Guide

## Quick Setup (Automatic - Recommended)

Your backend **automatically seeds** the database when it starts! Just:

1. **Update Railway DATABASE_URL** with Supabase connection string
2. **Wait for redeploy** (2-3 minutes)
3. **Check logs** - should see "✅ Database seeded successfully!"

**Default Admin Credentials:**
- Username: `admin`
- Password: `0000`

---

## Manual Setup (If Needed)

### Step 1: Run Prisma Migrations

```bash
# Navigate to backend directory
cd backend

# Set DATABASE_URL to your Supabase connection string
# Windows PowerShell:
$env:DATABASE_URL="postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Or create .env file:
# DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Run migrations
npx prisma db push
```

### Step 2: Seed Database

```bash
# Run the seed script
npm run seed

# Or run directly:
npx ts-node src/prisma/seed.ts
```

### Step 3: Verify

Check Supabase dashboard → Database → Tables:
- ✅ `Order` table exists
- ✅ `Photo` table exists
- ✅ `User` table exists
- ✅ `OrderCounter` table exists
- ✅ `GlobalConfig` table exists

Check `User` table:
- Should have 1 row with `username: 'admin'`

---

## Using Supabase SQL Editor (Alternative)

You can also run SQL directly in Supabase:

1. Go to Supabase dashboard
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**
4. Run this SQL:

```sql
-- Create admin user (password: 0000)
-- Note: This uses bcrypt hash - you need to generate it first
-- Better to let backend auto-seed this!

-- Just verify tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**But it's easier to just let the backend auto-seed!**

---

## Troubleshooting

### "Relation does not exist" error

**Solution:** Run migrations first:
```bash
cd backend
npx prisma db push
```

### "Admin user not found" after seeding

**Solution:** Check backend logs for seeding errors. The seed function retries automatically.

### "Connection refused" to Supabase

**Solution:** 
1. Check your Supabase project is running (not paused)
2. Verify DATABASE_URL is correct
3. Make sure you replaced `[YOUR-PASSWORD]` with actual password
4. Check Supabase firewall allows connections from Railway IPs

---

## Default Admin User

**Username:** `admin`  
**Password:** `0000`

**⚠️ Security Note:** Change this password in production!

To change admin password:
1. Login to admin panel
2. Go to user settings
3. Change password
4. Or update in database directly (hash with bcrypt first)

---

## What Gets Seeded Automatically

When backend starts, it automatically creates:

1. **OrderCounter**
   - `id: 'main-counter'`
   - `lastOrder: 0`

2. **Admin User**
   - `username: 'admin'`
   - `password: '0000'` (hashed with bcrypt)

3. **Database Tables**
   - All tables from Prisma schema
   - With proper relationships and constraints

---

## Next Steps

After database is set up:

1. ✅ Test admin login: `username: admin`, `password: 0000`
2. ✅ Create a test order
3. ✅ Upload test photos
4. ✅ Verify everything works

---

**Remember:** The backend auto-seeds on every startup, so you don't need to do anything manually! 🎉

