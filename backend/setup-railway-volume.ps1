# PowerShell script to set up Railway persistent volume
# This script helps configure the persistent volume for photo and PDF storage

Write-Host "🚂 Railway Persistent Volume Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI is not installed." -ForegroundColor Red
    Write-Host "Install it from: https://docs.railway.app/develop/cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host "Checking Railway login status..." -ForegroundColor Yellow
$loginStatus = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Railway. Please run: railway login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in to Railway" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
$backendDir = Join-Path $PSScriptRoot "."
if (-not (Test-Path $backendDir)) {
    Write-Host "❌ Backend directory not found: $backendDir" -ForegroundColor Red
    exit 1
}

Push-Location $backendDir
Write-Host "📁 Working directory: $backendDir" -ForegroundColor Cyan
Write-Host ""

# Check if linked to Railway project
Write-Host "Checking Railway project link..." -ForegroundColor Yellow
$linkCheck = railway status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not linked to a Railway project. Attempting to link..." -ForegroundColor Yellow
    railway link
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link to Railway project. Please link manually." -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Write-Host "✅ Linked to Railway project" -ForegroundColor Green
Write-Host ""

# Create persistent volume
Write-Host "Creating persistent volume..." -ForegroundColor Yellow
Write-Host "  Mount Path: /app/storage" -ForegroundColor Cyan
Write-Host "  This will store both uploads and PDFs" -ForegroundColor Gray

railway volume add -m /app/storage
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Volume creation failed or volume already exists. Continuing..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Volume created successfully" -ForegroundColor Green
}
Write-Host ""

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow

$variables = @(
    "STORAGE_BASE=/app/storage",
    "UPLOAD_DIR=/app/storage/uploads",
    "PDF_DIR=/app/storage/pdfs"
)

foreach ($var in $variables) {
    Write-Host "  Setting: $var" -ForegroundColor Gray
    railway variables --set $var
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Set successfully" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Failed to set (may already exist)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Redeploy your backend service on Railway" -ForegroundColor White
Write-Host "2. Verify the volume is mounted by checking logs for '📁 Storage configuration:'" -ForegroundColor White
Write-Host "3. Test by uploading a photo and then redeploying - the photo should persist" -ForegroundColor White
Write-Host ""
Write-Host "To redeploy:" -ForegroundColor Yellow
Write-Host "  - Via Dashboard: Backend service → Deployments → Redeploy" -ForegroundColor Gray
Write-Host "  - Via Git: git commit --allow-empty -m 'Configure volume' && git push" -ForegroundColor Gray
Write-Host ""

Pop-Location
