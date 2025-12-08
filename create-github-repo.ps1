# Create GitHub Repository Script
Write-Host "=== Creating GitHub Repository ===" -ForegroundColor Cyan
Write-Host ""

# Check GitHub CLI authentication
Write-Host "Checking GitHub CLI authentication..." -ForegroundColor Yellow
$authCheck = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ GitHub CLI not authenticated!" -ForegroundColor Red
    Write-Host "Please run: gh auth login" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ GitHub CLI is authenticated" -ForegroundColor Green
Write-Host ""

# Get repository name
$repoName = "2025-12-comenzi-lbb"

# Check if remote already exists
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to use this remote? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping repository creation." -ForegroundColor Yellow
        exit 0
    }
} else {
    # Create repository
    Write-Host "Creating repository: $repoName" -ForegroundColor Yellow
    gh repo create $repoName --public --source=. --remote=origin --push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Repository created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Repository URL:" -ForegroundColor Cyan
        git remote get-url origin
        Write-Host ""
        Write-Host "Next step: Connect this repository to Railway at:" -ForegroundColor Yellow
        Write-Host "https://railway.com/project/8f82c3a3-1b61-4f99-888c-a8c4da960d85" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Failed to create repository." -ForegroundColor Red
        Write-Host "Check the error above, or create it manually via GitHub web interface." -ForegroundColor Yellow
        Write-Host "See SETUP_GITHUB.md for manual instructions." -ForegroundColor Yellow
    }
}


