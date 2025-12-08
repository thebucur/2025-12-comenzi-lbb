# GitHub CLI Installation Guide

## Check if Already Installed

Run this command to check if GitHub CLI is installed:
```powershell
gh --version
```

If you see version information, GitHub CLI is already installed! Skip to authentication.

## Installation Methods

### Method 1: Using winget (Windows Package Manager) - RECOMMENDED

```powershell
winget install --id GitHub.cli
```

### Method 2: Using Chocolatey

If you have Chocolatey installed:
```powershell
choco install gh
```

### Method 3: Using Scoop

If you have Scoop installed:
```powershell
scoop install gh
```

### Method 4: Direct Download

1. Go to: https://github.com/cli/cli/releases/latest
2. Download: `gh_*_windows_amd64.msi` (or the appropriate version for your system)
3. Run the installer
4. Restart your terminal/PowerShell

## After Installation

1. **Close and reopen your terminal/PowerShell** (required to refresh PATH)

2. **Verify installation**:
   ```powershell
   gh --version
   ```

3. **Authenticate**:
   ```powershell
   gh auth login
   ```
   - Choose "GitHub.com"
   - Choose "HTTPS"
   - Choose "Login with a web browser"
   - Copy the code and authorize in your browser

4. **Create your repository**:
   ```powershell
   gh repo create 2025-12-comenzi-lbb --public --source=. --remote=origin --push
   ```

## Troubleshooting

If `gh` command is not found after installation:
- Close and reopen your terminal/PowerShell
- Restart your computer if needed
- Check if GitHub CLI was added to your PATH


