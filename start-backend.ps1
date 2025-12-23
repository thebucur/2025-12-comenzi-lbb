# Script to start the backend server
Write-Host "=== Starting Backend Server ===" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    Write-Host "   Expected path: $backendPath" -ForegroundColor Yellow
    exit 1
}

# Change to backend directory
Set-Location $backendPath
Write-Host "Changed to backend directory: $backendPath" -ForegroundColor Gray
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Write-Host ""
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "   Backend will use default values:" -ForegroundColor Gray
    Write-Host "   - PORT: 5000" -ForegroundColor Gray
    Write-Host "   - HOST: 0.0.0.0" -ForegroundColor Gray
    Write-Host "   - DATABASE_URL: (must be set)" -ForegroundColor Yellow
    Write-Host ""
}

# Check if Prisma client is generated
if (-not (Test-Path "node_modules\.prisma")) {
    Write-Host "⚠️  Prisma client not generated. Generating..." -ForegroundColor Yellow
    Write-Host ""
    npm run prisma:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to generate Prisma client!" -ForegroundColor Red
        Write-Host "   Make sure DATABASE_URL is set in .env file" -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
}

Write-Host "✅ Starting backend server..." -ForegroundColor Green
Write-Host "   Server will run on: http://localhost:5000" -ForegroundColor Gray
Write-Host "   Health check: http://localhost:5000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Start the server
npm run dev






