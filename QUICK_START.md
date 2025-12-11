# Quick Start Guide

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js installed (v18+)
- ✅ PostgreSQL installed and running
- ✅ Database `cake_ordering` created

## Quick Setup (Automated)

Run the setup script:

```powershell
.\setup-local.ps1
```

This will:
1. Install all dependencies
2. Create .env files
3. Generate Prisma client
4. Optionally run database migrations

## Manual Setup

### 1. Install Dependencies

**Backend:**
```powershell
cd backend
npm install
```

**Frontend:**
```powershell
cd frontend
npm install
```

### 2. Configure Database

Edit `backend/.env` and update:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cake_ordering?schema=public"
```

### 3. Setup Database

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When prompted, name the migration: `init`

### 4. Seed Database (Optional)

```powershell
npm run prisma:seed
```

## Running the Application

### Option 1: Run Both Servers (Recommended)

Open **two terminal windows**:

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option 2: Use Test Script

```powershell
.\test-local.ps1
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health
- **Prisma Studio:** Run `npm run prisma:studio` in backend directory

## Testing the Application

1. Open http://localhost:3000
2. Fill out the wizard:
   - **Step 1:** Select delivery method, location, staff, enter client details
   - **Step 2:** Select cake type, weight, shape, floors
   - **Step 3:** Select coating, colors (max 2), decor type, add details
   - **Step 4:** Review and submit
3. Check the database with Prisma Studio to see the created order

## Troubleshooting

### Database Connection Error

1. Make sure PostgreSQL is running
2. Verify database exists: `psql -U postgres -l` (look for `cake_ordering`)
3. Check `DATABASE_URL` in `backend/.env`

### Port Already in Use

- Backend: Change `PORT` in `backend/.env`
- Frontend: Vite will auto-select next available port

### Migration Errors

```powershell
cd backend
npx prisma migrate reset  # WARNING: This deletes all data!
npx prisma migrate dev
```

### Module Not Found Errors

Make sure you've run `npm install` in both `backend` and `frontend` directories.

## Next Steps

Once local testing works:
1. Test all features (form, photos, PDF generation)
2. Verify email sending (if configured)
3. Test admin interface
4. Prepare for Railway deployment





