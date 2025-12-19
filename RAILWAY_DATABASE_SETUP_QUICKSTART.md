# Railway Database Setup - Quick Start

## ⚠️ Your Issue

Your backend can't start because there's **no database** in Railway.

## 🚀 Quick Fix (5 minutes)

### 1. Add PostgreSQL Database

Go to Railway: **https://railway.app**

```
Your Project → Click "+ New" → Select "Database" → Choose "PostgreSQL" → Add
```

### 2. Verify DATABASE_URL

```
Backend Service → Variables tab → Check for DATABASE_URL
```

Should look like:
```
postgresql://postgres:xxxxx@postgres.railway.internal:5432/railway
```

**If missing:** Copy it from PostgreSQL service variables and add it to backend.

### 3. Wait for Redeploy

Railway will automatically redeploy your backend (2-3 minutes).

### 4. Check Logs

```
Backend Service → Deployments → Click latest deployment → View logs
```

Look for:
```
✅ Database is ready
✅ Database connection established
🚀 Server running on http://0.0.0.0:5000
```

### 5. Test

```bash
curl https://your-backend.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "database": { "status": "connected" }
}
```

## ✅ Done!

Once you see "connected", your database is working and you can test photo uploads.

---

**Detailed guide:** See `FIX_RAILWAY_DATABASE_MISSING.md`
