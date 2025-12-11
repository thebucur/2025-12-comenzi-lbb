# Local Testing Instructions

## ✅ Setup Complete!

Your environment files have been created:
- ✅ `backend/.env` - Update with your PostgreSQL password
- ✅ `frontend/.env` - Already configured for local development

## 🚀 Next Steps

### 1. Update Database Credentials

Edit `backend/.env` and change:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cake_ordering?schema=public"
```
Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

### 2. Create Database (if not exists)

Open PostgreSQL and run:
```sql
CREATE DATABASE cake_ordering;
```

Or use psql:
```bash
psql -U postgres
CREATE DATABASE cake_ordering;
\q
```

### 3. Install Dependencies

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

### 4. Setup Database Schema

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When prompted, name the migration: `init`

### 5. Seed Database (Optional)

```powershell
npm run prisma:seed
```

### 6. Start the Application

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

### 7. Test the Application

1. Open http://localhost:3000 in your browser
2. You should see the Cake Ordering Wizard
3. Test the complete flow:
   - Fill out all 4 steps
   - Try photo upload (QR code)
   - Submit an order
   - Check the database with Prisma Studio

## 🔍 Verify Everything Works

### Check Backend Health
Visit: http://localhost:5000/health
Should return: `{"status":"ok"}`

### Check Database
```powershell
cd backend
npm run prisma:studio
```
This opens a GUI to view your database tables.

### Test API Endpoints
- Health: http://localhost:5000/health
- Orders: http://localhost:5000/api/orders (GET)
- Create Order: http://localhost:5000/api/orders (POST)

## 📝 Testing Checklist

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5000/health
- [ ] Can navigate through all 4 wizard steps
- [ ] Form validation works (try submitting incomplete forms)
- [ ] Can submit a complete order
- [ ] Order appears in database (check with Prisma Studio)
- [ ] PDF is generated when order is submitted
- [ ] Photo upload works (QR code flow)
- [ ] Admin interface loads (if you have an order ID)

## 🐛 Common Issues

### "Cannot connect to database"
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Verify database `cake_ordering` exists

### "Port 5000 already in use"
- Change `PORT` in `backend/.env` to another port (e.g., 5001)
- Update `VITE_API_URL` in `frontend/.env` to match

### "Module not found"
- Run `npm install` in both `backend` and `frontend` directories

### "Prisma client not generated"
- Run `npm run prisma:generate` in `backend` directory

## 📚 Additional Resources

- See `SETUP_LOCAL.md` for detailed setup instructions
- See `QUICK_START.md` for quick reference
- See `README.md` for project overview

## ✨ Ready for Railway?

Once local testing is successful:
1. All features work correctly
2. Database migrations are tested
3. Environment variables are documented
4. You're ready to deploy to Railway!









