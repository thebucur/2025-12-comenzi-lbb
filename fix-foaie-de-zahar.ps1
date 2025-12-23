# Script to fix foaie de zahar flags for orders
# This will update photos with "foaie-de-zahar" in filename to have isFoaieDeZahar flag set

param(
    [string]$BackendUrl = "",
    [string]$AdminUsername = "admin",
    [int[]]$OrderNumbers = @(21, 22)
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Foaie de Zahar Flags" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get backend URL if not provided
if ([string]::IsNullOrEmpty($BackendUrl)) {
    Write-Host "Enter Railway backend URL (e.g., https://nodejs-production-87d3.up.railway.app)" -ForegroundColor Yellow
    Write-Host "Or press Enter to use: https://nodejs-production-87d3.up.railway.app" -ForegroundColor Gray
    $input = Read-Host "Backend URL"
    if ([string]::IsNullOrEmpty($input)) {
        $BackendUrl = "https://nodejs-production-87d3.up.railway.app"
    } else {
        $BackendUrl = $input
    }
}

# Remove trailing slash
$BackendUrl = $BackendUrl.TrimEnd('/')

# Ensure /api is in the URL
if (-not $BackendUrl.EndsWith('/api')) {
    $BackendUrl = "$BackendUrl/api"
}

Write-Host ""
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Green
Write-Host "Admin Username: $AdminUsername" -ForegroundColor Green
Write-Host "Orders to fix: $($OrderNumbers -join ', ')" -ForegroundColor Green
Write-Host ""

# Function to make authenticated API call
function Invoke-AuthenticatedRequest {
    param(
        [string]$Url,
        [string]$Method = "POST",
        [string]$Username
    )
    
    $headers = @{
        "Authorization" = "Bearer $Username"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        return $response
    } catch {
        $errorDetails = $_.ErrorDetails.Message
        if ($errorDetails) {
            try {
                $errorJson = $errorDetails | ConvertFrom-Json
                return @{ error = $errorJson.error; statusCode = $_.Exception.Response.StatusCode.value__ }
            } catch {
                return @{ error = $errorDetails; statusCode = $_.Exception.Response.StatusCode.value__ }
            }
        }
        throw $_
    }
}

# Fix specific orders
Write-Host "Fixing specific orders..." -ForegroundColor Yellow
foreach ($orderNumber in $OrderNumbers) {
    Write-Host ""
    Write-Host "Fixing order $orderNumber..." -ForegroundColor Cyan
    
    $url = "$BackendUrl/admin/fix-foaie-de-zahar-flags?orderNumber=$orderNumber"
    
    try {
        $result = Invoke-AuthenticatedRequest -Url $url -Username $AdminUsername
        
        if ($result.error) {
            Write-Host "  ❌ Error: $($result.error)" -ForegroundColor Red
        } else {
            Write-Host "  ✅ Fixed $($result.fixedCount) photo(s) for order $orderNumber" -ForegroundColor Green
            if ($result.results) {
                foreach ($r in $result.results) {
                    if ($r.action -eq 'fixed') {
                        Write-Host "    - Photo $($r.photoId): Fixed" -ForegroundColor Gray
                    } elseif ($r.action -eq 'error') {
                        Write-Host "    - Photo $($r.photoId): Error - $($r.error)" -ForegroundColor Red
                    }
                }
            }
        }
    } catch {
        Write-Host "  ❌ Failed to fix order $orderNumber" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "    Authentication failed. Check your admin username." -ForegroundColor Yellow
        }
    }
}

# Ask if user wants to fix all orders
Write-Host ""
Write-Host "Do you want to fix ALL orders? (y/N)" -ForegroundColor Yellow
$fixAll = Read-Host "Fix all orders"

if ($fixAll -eq 'y' -or $fixAll -eq 'Y') {
    Write-Host ""
    Write-Host "Fixing all orders..." -ForegroundColor Yellow
    
    $url = "$BackendUrl/admin/fix-foaie-de-zahar-flags"
    
    try {
        $result = Invoke-AuthenticatedRequest -Url $url -Username $AdminUsername
        
        if ($result.error) {
            Write-Host "  ❌ Error: $($result.error)" -ForegroundColor Red
        } else {
            Write-Host "  ✅ Fixed $($result.fixedCount) photo(s) across $($result.totalOrdersChecked) order(s)" -ForegroundColor Green
            if ($result.results -and $result.results.Count -gt 0) {
                Write-Host ""
                Write-Host "  Results by order:" -ForegroundColor Cyan
                $resultsByOrder = $result.results | Group-Object -Property orderNumber
                foreach ($group in $resultsByOrder) {
                    $fixed = ($group.Group | Where-Object { $_.action -eq 'fixed' }).Count
                    $errors = ($group.Group | Where-Object { $_.action -eq 'error' }).Count
                    Write-Host "    Order $($group.Name): $fixed fixed, $errors errors" -ForegroundColor Gray
                }
            }
        }
    } catch {
        Write-Host "  ❌ Failed to fix all orders" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "    Authentication failed. Check your admin username." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now try downloading the foaie de zahar files for orders 21 and 22." -ForegroundColor Yellow



