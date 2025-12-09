# Cake Ordering Wizard System

A multi-step wizard application for cake ordering with dark mode UI, backend API for order management, QR code scanning for photo uploads, and PDF generation.

## Tech Stack

**Frontend:**
- React with Vite + TypeScript
- React Router for navigation
- Tailwind CSS for styling (dark mode theme)
- React Context API for state management
- html5-qrcode for QR code scanning
- Google Speech-to-Text for voice transcription

**Backend:**
- Node.js with Express + TypeScript
- PostgreSQL database with Prisma ORM
- Multer for file uploads
- PDFKit for PDF generation
- Nodemailer with SMTP for email delivery

## Project Structure

```
project-root/
├── frontend/          # React frontend application
├── backend/          # Node.js backend API
└── README.md
```

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and email settings
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL="postgresql://user:password@localhost:5432/cake_ordering?schema=public"
PORT=5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
UPLOAD_DIR=./uploads
PDF_DIR=./pdfs
```

### Frontend

Create `.env` file:

```
VITE_API_URL=http://localhost:5000/api
```

## Railway Deployment

This project is configured for deployment on Railway.

1. Connect your GitHub repository to Railway
2. Add PostgreSQL service in Railway
3. Set environment variables in Railway dashboard
4. Deploy!

The backend will automatically:
- Run Prisma migrations on deploy
- Generate Prisma client
- Start the Express server

## Features

- Multi-step wizard with progress tracking
- Dark mode UI with neon pink accents
- QR code scanning for photo uploads
- Photo upload with compression
- PDF generation with order details and photos
- Email delivery of PDFs
- Order management and reporting backend
- Admin interface for viewing orders
- Multi-instance support with centralized order numbering
- Romanian language throughout
- Voice transcription with Web Speech API

## License

MIT
