# How to Start the Servers

## Quick Start (Manual Steps)

Since PowerShell execution policy may block npm, follow these steps:

### Step 1: Install Dependencies

Open **two separate terminal/PowerShell windows**:

**Terminal 1 - Backend:**
```powershell
cd "D:\Dropbox\CURSOR\2025 12 COMENZI LBB\backend"
npm install
```

**Terminal 2 - Frontend:**
```powershell
cd "D:\Dropbox\CURSOR\2025 12 COMENZI LBB\frontend"
npm install
```

### Step 2: Setup Database (First Time Only)

**In Terminal 1 (Backend):**
```powershell
npm run prisma:generate
npm run prisma:migrate
```
When prompted, name the migration: `init`

### Step 3: Start the Servers

**Terminal 1 - Backend Server:**
```powershell
npm run dev
```
You should see: `Server running on port 5000`

**Terminal 2 - Frontend Server:**
```powershell
npm run dev
```
You should see: `Local: http://localhost:3000`

### Step 4: Open in Browser

Open: **http://localhost:3000**

## If npm Command Doesn't Work

If you get execution policy errors, try one of these:

### Option 1: Use Command Prompt (cmd) instead of PowerShell
Open `cmd` (not PowerShell) and run the commands there.

### Option 2: Bypass Execution Policy (Temporary)
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```
Then run npm commands.

### Option 3: Use Full Path
```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

## Troubleshooting

### "Cannot find module" errors
- Make sure you ran `npm install` in both directories
- Check that `node_modules` folders exist

### "Port already in use"
- Close other applications using ports 3000 or 5000
- Or change ports in `.env` files

### "Database connection error"
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Verify database `cake_ordering` exists

## What You Should See

**Backend Terminal:**
```
Server running on port 5000
```

**Frontend Terminal:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Browser:**
- Dark navy background (#0f0f2d)
- Pink progress stepper at the top
- "Ridicare / Livrare" form

## Quick Checklist

- [ ] Dependencies installed (`npm install` in both folders)
- [ ] Database created (`cake_ordering`)
- [ ] Database migrated (`npm run prisma:migrate`)
- [ ] Backend running (port 5000)
- [ ] Frontend running (port 3000)
- [ ] Browser opened to http://localhost:3000


















