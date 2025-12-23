# Test Supabase connection with different formats

$PROJECT_REF = "nskvbjrtajbolkluakdl"
$PASSWORD = "1234Bucur%24"  # URL-encoded password

Write-Host "Testing different Supabase connection formats..." -ForegroundColor Cyan
Write-Host ""

# Format 1: Direct connection (port 5432)
Write-Host "1. Testing direct connection (port 5432)..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
Write-Host "   Connection string: postgresql://postgres:***@db.${PROJECT_REF}.supabase.co:5432/postgres"
$result1 = npx prisma db push --skip-generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ SUCCESS with direct connection!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "   ❌ Failed: $($result1 | Select-Object -Last 3)" -ForegroundColor Red
}

Write-Host ""

# Format 2: Pooler connection (port 6543) - Format A
Write-Host "2. Testing pooler connection - Format A (port 6543)..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
Write-Host "   Connection string: postgresql://postgres.${PROJECT_REF}:***@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
$result2 = npx prisma db push --skip-generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ SUCCESS with pooler Format A!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "   ❌ Failed: $($result2 | Select-Object -Last 3)" -ForegroundColor Red
}

Write-Host ""

# Format 3: Pooler connection - Format B (different region)
Write-Host "3. Testing pooler connection - Format B..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres:${PASSWORD}@${PROJECT_REF}.pooler.supabase.com:6543/postgres"
Write-Host "   Connection string: postgresql://postgres:***@${PROJECT_REF}.pooler.supabase.com:6543/postgres"
$result3 = npx prisma db push --skip-generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ SUCCESS with pooler Format B!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "   ❌ Failed: $($result3 | Select-Object -Last 3)" -ForegroundColor Red
}

Write-Host ""
Write-Host "❌ All connection formats failed." -ForegroundColor Red
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Supabase dashboard → Settings → Database" -ForegroundColor White
Write-Host "2. Copy the EXACT connection string from 'Connection string' section" -ForegroundColor White
Write-Host "3. Use that exact string (it's already properly formatted)" -ForegroundColor White
Write-Host "4. Make sure your Supabase project region matches the connection string" -ForegroundColor White

