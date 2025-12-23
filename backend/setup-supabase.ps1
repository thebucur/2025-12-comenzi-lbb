# PowerShell script to set up Supabase database
# Run this script to create tables and seed data

# IMPORTANT: Replace YOUR_PASSWORD with your actual Supabase password
# If your password contains special characters, they need to be URL-encoded:
#   $ becomes %24
#   @ becomes %40
#   # becomes %23
#   % becomes %25
#   & becomes %26
#   + becomes %2B
#   = becomes %3D
#   ? becomes %3F
#   / becomes %2F
#   \ becomes %5C
#   : becomes %3A
#   ; becomes %3B
#   , becomes %2C
#   | becomes %7C
#   [ becomes %5B
#   ] becomes %5D
#   { becomes %7B
#   } becomes %7D
#   < becomes %3C
#   > becomes %3E
#   " becomes %22
#   ' becomes %27
#   ` becomes %60
#   ^ becomes %5E
#   ~ becomes %7E
#   ! becomes %21
#   * becomes %2A
#   ( becomes %28
#   ) becomes %29
#   space becomes %20

# Your Supabase connection string
# Format: postgresql://postgres:[ENCODED_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
# OR use pooler: postgresql://postgres.[PROJECT_REF]:[ENCODED_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Example: If password is "1234Bucur$", it becomes "1234Bucur%24"
$SUPABASE_PASSWORD = "1234Bucur%24"  # Replace with your encoded password
$PROJECT_REF = "nskvbjrtajbolkluakdl"  # Your Supabase project reference

# Try direct connection first (port 5432)
$DATABASE_URL = "postgresql://postgres:${SUPABASE_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

Write-Host "🔌 Setting DATABASE_URL..." -ForegroundColor Cyan
$env:DATABASE_URL = $DATABASE_URL

Write-Host "📊 Running Prisma migrations..." -ForegroundColor Cyan
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations successful!" -ForegroundColor Green
    
    Write-Host "`n🌱 Seeding database..." -ForegroundColor Cyan
    npx tsx scripts/setup-supabase.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Database setup complete!" -ForegroundColor Green
        Write-Host "`n📝 Summary:" -ForegroundColor Cyan
        Write-Host "  - Tables: Created" -ForegroundColor White
        Write-Host "  - Admin User: Created (username: admin, password: 0000)" -ForegroundColor White
        Write-Host "  - Order Counter: Initialized" -ForegroundColor White
    } else {
        Write-Host "`n❌ Seeding failed. Check errors above." -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Migration failed. Trying pooler connection..." -ForegroundColor Yellow
    
    # Try pooler connection (port 6543) - more reliable
    $DATABASE_URL_POOLER = "postgresql://postgres.${PROJECT_REF}:${SUPABASE_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
    $env:DATABASE_URL = $DATABASE_URL_POOLER
    
    Write-Host "🔌 Trying pooler connection..." -ForegroundColor Cyan
    npx prisma db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations successful with pooler!" -ForegroundColor Green
        Write-Host "`n🌱 Seeding database..." -ForegroundColor Cyan
        npx tsx scripts/setup-supabase.ts
    } else {
        Write-Host "`n❌ Both connection methods failed." -ForegroundColor Red
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check your Supabase project is running (not paused)" -ForegroundColor White
        Write-Host "  2. Verify your password is correct" -ForegroundColor White
        Write-Host "  3. Make sure special characters in password are URL-encoded" -ForegroundColor White
        Write-Host "  4. Check Supabase dashboard → Settings → Database → Connection string" -ForegroundColor White
    }
}



