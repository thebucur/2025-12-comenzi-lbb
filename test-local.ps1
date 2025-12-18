# Quick Test Script
Write-Host "=== Starting Local Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env files exist
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ backend/.env not found!" -ForegroundColor Red
    Write-Host "   Please run setup-local.ps1 first or create backend/.env manually" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "❌ frontend/.env not found!" -ForegroundColor Red
    Write-Host "   Creating frontend/.env..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath "frontend\.env" -Encoding utf8
}

Write-Host "Starting backend server..." -ForegroundColor Yellow
Write-Host "  (Press Ctrl+C to stop)" -ForegroundColor Gray
Write-Host ""

# Start backend in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    npm run dev
}

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Write-Host "  (Press Ctrl+C to stop)" -ForegroundColor Gray
Write-Host ""

# Start frontend
Set-Location frontend
npm run dev

# Cleanup on exit
Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Job $backendJob
Remove-Job $backendJob














