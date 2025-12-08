# Script to create GitHub repository and connect it
Write-Host "Creating GitHub repository..." -ForegroundColor Green

# Check if GitHub CLI is authenticated
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub CLI not authenticated. Please run: gh auth login" -ForegroundColor Red
    exit 1
}

# Create repository
Write-Host "Creating repository: 2025-12-comenzi-lbb" -ForegroundColor Yellow
gh repo create 2025-12-comenzi-lbb --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Repository created successfully!" -ForegroundColor Green
    Write-Host "Remote URL:" -ForegroundColor Cyan
    git remote -v
    Write-Host "`nNext step: Connect this repository to Railway for auto-deployment" -ForegroundColor Yellow
} else {
    Write-Host "Repository creation failed. Check if it already exists or if you need to authenticate." -ForegroundColor Red
}


