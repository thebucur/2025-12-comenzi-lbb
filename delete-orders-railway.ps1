# Script pentru ștergerea tuturor comenzilor de pe Railway
# Folosește endpoint-ul admin temporar

param(
    [string]$RailwayUrl = "https://nodejs-production-87d3.up.railway.app",
    [string]$Username = "admin",
    [string]$Password = "0000"
)

Write-Host "🔐 Autentificare ca admin..." -ForegroundColor Cyan

# Step 1: Login pentru a obține token
$loginUrl = "$RailwayUrl/api/auth/login"
$loginBody = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if (-not $token) {
        Write-Host "❌ Nu s-a primit token de la server" -ForegroundColor Red
        Write-Host "Response: $($loginResponse | ConvertTo-Json)" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Autentificare reușită! Token: $token" -ForegroundColor Green
} catch {
    Write-Host "❌ Eroare la autentificare: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalii: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n🗑️  Ștergere comenzilor și fișierelor..." -ForegroundColor Cyan

# Step 2: Ștergere comenzilor
$deleteUrl = "$RailwayUrl/api/admin/orders/all"
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $deleteResponse = Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers
    
    Write-Host "✅ Ștergere reușită!" -ForegroundColor Green
    Write-Host "`n📊 Rezumat:" -ForegroundColor Cyan
    Write-Host "   - Comenzi șterse: $($deleteResponse.summary.ordersDeleted)" -ForegroundColor White
    Write-Host "   - Fișiere șterse: $($deleteResponse.summary.filesDeleted)" -ForegroundColor White
    Write-Host "   - Fișiere eșuate: $($deleteResponse.summary.filesFailed)" -ForegroundColor White
    Write-Host "   - Counter resetat: $($deleteResponse.summary.orderCounterReset)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Eroare la ștergere: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalii: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n✨ Operațiune finalizată cu succes!" -ForegroundColor Green



