# Script to fix foaie de zahar flags directly in the database
# This uses Prisma to directly update the database

param(
    [int[]]$OrderNumbers = @(21, 22),
    [string]$DatabaseUrl = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Foaie de Zahar - Database Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is provided
if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Host "Enter Railway DATABASE_URL" -ForegroundColor Yellow
    Write-Host "You can find this in Railway dashboard → PostgreSQL service → Variables → DATABASE_URL" -ForegroundColor Gray
    Write-Host ""
    $DatabaseUrl = Read-Host "DATABASE_URL"
    
    if ([string]::IsNullOrEmpty($DatabaseUrl)) {
        Write-Host "❌ DATABASE_URL is required!" -ForegroundColor Red
        exit 1
    }
}

# Set environment variable
$env:DATABASE_URL = $DatabaseUrl

Write-Host ""
Write-Host "Orders to fix: $($OrderNumbers -join ', ')" -ForegroundColor Green
Write-Host ""

# Change to backend directory
$backendDir = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path $backendDir)) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $backendDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Generate Prisma client if needed
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client!" -ForegroundColor Red
    exit 1
}

# Build order numbers argument
$orderArgs = $OrderNumbers | ForEach-Object { "$_" }

# Run the fix script
Write-Host ""
Write-Host "Running fix script..." -ForegroundColor Yellow
Write-Host ""

if ($orderArgs.Count -gt 0) {
    npx tsx scripts/fix-foaie-de-zahar.ts @orderArgs
} else {
    npx tsx scripts/fix-foaie-de-zahar.ts
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Fix completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "❌ Fix failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    exit 1
}
