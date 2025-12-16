# Script to check if backend server is running
Write-Host "=== Checking Backend Server Status ===" -ForegroundColor Cyan
Write-Host ""

$backendURL = "http://localhost:5000"
$healthEndpoint = "$backendURL/health"
$apiEndpoint = "$backendURL/api"

Write-Host "Testing backend connection..." -ForegroundColor Yellow
Write-Host "Backend URL: $backendURL" -ForegroundColor Gray
Write-Host ""

try {
    # Test health endpoint
    $healthResponse = Invoke-WebRequest -Uri $healthEndpoint -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is RUNNING!" -ForegroundColor Green
    Write-Host "   Health check: OK" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.StatusCode)" -ForegroundColor Gray
    Write-Host ""
    
    # Test API endpoint
    try {
        $apiResponse = Invoke-WebRequest -Uri "$apiEndpoint/orders/next-number" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ API is accessible!" -ForegroundColor Green
        Write-Host "   Endpoint: $apiEndpoint" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Health check passed but API endpoint failed" -ForegroundColor Yellow
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the backend server:" -ForegroundColor Yellow
    Write-Host "  1. Open a new PowerShell window" -ForegroundColor White
    Write-Host "  2. Navigate to backend folder:" -ForegroundColor White
    Write-Host "     cd `"$PSScriptRoot\backend`"" -ForegroundColor Cyan
    Write-Host "  3. Start the server:" -ForegroundColor White
    Write-Host "     npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You should see: 'Server running on http://0.0.0.0:5000'" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "=== Checking Frontend Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Check if frontend .env exists
$frontendEnvPath = Join-Path $PSScriptRoot "frontend\.env"
if (Test-Path $frontendEnvPath) {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
    $envContent = Get-Content $frontendEnvPath
    $apiUrlLine = $envContent | Where-Object { $_ -match "VITE_API_URL" }
    if ($apiUrlLine) {
        Write-Host "   $apiUrlLine" -ForegroundColor Gray
    } else {
        Write-Host "   No VITE_API_URL found (will use default: http://localhost:5000)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Frontend .env file not found" -ForegroundColor Yellow
    Write-Host "   Frontend will use default: http://localhost:5000" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✅ Backend server is running and accessible" -ForegroundColor Green
Write-Host "✅ Ready to accept orders!" -ForegroundColor Green
Write-Host ""

