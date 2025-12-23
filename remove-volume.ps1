# Script to remove Railway volume from backend service
Write-Host "Removing Railway volume from backend..." -ForegroundColor Green

# Check if Railway CLI is installed and authenticated
$railwayStatus = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Railway CLI not authenticated or not installed." -ForegroundColor Red
    Write-Host "Please run: railway login" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, remove the volume via Railway Dashboard:" -ForegroundColor Yellow
    Write-Host "1. Go to https://railway.app" -ForegroundColor Cyan
    Write-Host "2. Select your project" -ForegroundColor Cyan
    Write-Host "3. Select the backend service" -ForegroundColor Cyan
    Write-Host "4. Go to 'Settings' tab" -ForegroundColor Cyan
    Write-Host "5. Find 'Volumes' section" -ForegroundColor Cyan
    Write-Host "6. Click 'Remove' or 'Delete' on the attached volume" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Railway CLI authenticated" -ForegroundColor Green

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found at: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "Changed to backend directory: $backendPath" -ForegroundColor Cyan

# List volumes to see what's attached
Write-Host ""
Write-Host "Checking for attached volumes..." -ForegroundColor Yellow
railway volumes 2>&1 | Out-String

# Note: Railway CLI doesn't have a direct "remove volume" command
# Volumes must be removed via the dashboard or by unlinking the service
Write-Host ""
Write-Host "⚠️  Railway CLI doesn't support removing volumes directly." -ForegroundColor Yellow
Write-Host "Please remove the volume via Railway Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://railway.app" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Select the backend service" -ForegroundColor White
Write-Host "4. Go to 'Settings' tab" -ForegroundColor White
Write-Host "5. Scroll to 'Volumes' section" -ForegroundColor White
Write-Host "6. Click the '...' menu or 'Remove' button on the volume" -ForegroundColor White
Write-Host "7. Confirm deletion" -ForegroundColor White
Write-Host ""
Write-Host "After removing the volume, your app will use ephemeral storage." -ForegroundColor Green
Write-Host "Files will be stored in the container's filesystem (will be lost on redeploy)." -ForegroundColor Yellow



