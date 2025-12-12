# Local Setup Script for Cake Ordering Wizard
Write-Host "=== Cake Ordering Wizard - Local Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgVersion = psql --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PostgreSQL not found in PATH. Make sure PostgreSQL is installed." -ForegroundColor Yellow
    Write-Host "   You can still proceed, but make sure PostgreSQL is running." -ForegroundColor Yellow
} else {
    Write-Host "✅ PostgreSQL found" -ForegroundColor Green
}
Write-Host ""

# Setup Backend
Write-Host "=== Setting up Backend ===" -ForegroundColor Cyan
Set-Location backend

if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
    Write-Host "⚠️  Please edit backend/.env with your database credentials!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma client generated" -ForegroundColor Green

Write-Host ""
Write-Host "⚠️  IMPORTANT: Before running migrations, make sure:" -ForegroundColor Yellow
Write-Host "   1. PostgreSQL is running" -ForegroundColor Yellow
Write-Host "   2. Database 'cake_ordering' exists" -ForegroundColor Yellow
Write-Host "   3. DATABASE_URL in backend/.env is correct" -ForegroundColor Yellow
Write-Host ""

$runMigrations = Read-Host "Run database migrations now? (y/n)"
if ($runMigrations -eq "y") {
    Write-Host "Running migrations..." -ForegroundColor Yellow
    npm run prisma:migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Migration failed. Please check your database connection." -ForegroundColor Red
    } else {
        Write-Host "✅ Migrations completed" -ForegroundColor Green
    }
}

Set-Location ..

# Setup Frontend
Write-Host ""
Write-Host "=== Setting up Frontend ===" -ForegroundColor Cyan
Set-Location frontend

if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host "  1. Terminal 1: cd backend && npm run dev" -ForegroundColor White
Write-Host "  2. Terminal 2: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host ""











