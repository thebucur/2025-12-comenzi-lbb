# Script to get your local network IP address for mobile QR scanning
Write-Host "=== Finding Your Local Network IP Address ===" -ForegroundColor Cyan
Write-Host ""

# Get IPv4 addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
} | Select-Object -ExpandProperty IPAddress

if ($ipAddresses.Count -eq 0) {
    Write-Host "No local network IP found. Make sure you're connected to a network." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative method:" -ForegroundColor Yellow
    Write-Host "Run: ipconfig | findstr IPv4" -ForegroundColor Cyan
} else {
    Write-Host "Your local network IP address(es):" -ForegroundColor Green
    foreach ($ip in $ipAddresses) {
        Write-Host "  $ip" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "To use this IP for mobile QR scanning:" -ForegroundColor Cyan
    Write-Host "1. Open your app in the browser" -ForegroundColor White
    Write-Host "2. Open browser console (F12)" -ForegroundColor White
    Write-Host "3. Run: localStorage.setItem('localNetworkIP', '$($ipAddresses[0])')" -ForegroundColor Yellow
    Write-Host "4. Refresh the page and generate a new QR code" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the UI: When generating QR code, click 'Setează IP local' and enter: $($ipAddresses[0])" -ForegroundColor Cyan
}





