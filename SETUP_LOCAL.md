# Local Setup Guide

This guide will help you set up and test the Cake Ordering Wizard System locally.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
3. **npm** or **yarn** package manager

## Step 1: Install PostgreSQL

1. Download and install PostgreSQL from https://www.postgresql.org/download/
2. During installation, remember the password you set for the `postgres` user
3. Make sure PostgreSQL is running (check Services on Windows)

## Step 2: Create Database

Open PostgreSQL command line or pgAdmin and run:

```sql
CREATE DATABASE cake_ordering;
```

Or using psql:
```bash
psql -U postgres
CREATE DATABASE cake_ordering;
\q
```

## Step 3: Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Update `backend/.env` with your PostgreSQL credentials:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cake_ordering?schema=public"
   ```
   Replace `YOUR_PASSWORD` with your PostgreSQL password.

3. For email functionality (optional for testing), update SMTP settings in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```
   Note: For Gmail, you'll need to generate an App Password.

4. Install dependencies:
   ```bash
   npm install
   ```

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```
   When prompted, name the migration: `init`

## Step 4: Configure Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. The `.env` file should already be configured with:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Step 5: Run the Application

### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

The backend should start on `http://localhost:5000`

### Terminal 2 - Frontend Server

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:3000` (or another port if 3000 is busy)

## Step 6: Test the Application

1. Open your browser and go to `http://localhost:3000`
2. You should see the Cake Ordering Wizard
3. Fill out the form through all 4 steps:
   - **Step 1 (Ridicare)**: Select delivery method, location, staff, and enter client details
   - **Step 2 (Sortiment)**: Select cake type, weight, shape, and floors
   - **Step 3 (Decor)**: Select coating, colors, decor type, and add details
   - **Step 4 (Finalizare)**: Review and submit the order

## Troubleshooting

### Database Connection Issues

- Make sure PostgreSQL is running
- Check that the DATABASE_URL in `backend/.env` is correct
- Verify the database `cake_ordering` exists

### Port Already in Use

- Backend: Change `PORT` in `backend/.env`
- Frontend: Vite will automatically use the next available port

### Prisma Migration Issues

- If migrations fail, try resetting the database:
  ```bash
  cd backend
  npx prisma migrate reset
  npx prisma migrate dev
  ```

### Email Not Sending

- Email is optional for local testing
- Orders will still be created and PDFs generated
- Configure SMTP settings if you want to test email functionality

## Useful Commands

### Backend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:migrate` - Run database migrations

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Next Steps

Once local testing is successful:
1. Test all features (form submission, photo upload, PDF generation)
2. Verify admin interface at `/admin/orders/:id`
3. Check database with Prisma Studio: `npm run prisma:studio` in backend directory
4. Prepare for Railway deployment





