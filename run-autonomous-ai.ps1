# Autonomous AI System Launcher
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "       AUTONOMOUS AI SYSTEM LAUNCHER" -ForegroundColor Cyan  
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Join-Path $scriptPath "deepseek-cursor-competitor"

Write-Host "Script Location: $scriptPath" -ForegroundColor Yellow
Write-Host "Project Path: $projectPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $projectPath)) {
    Write-Host "ERROR: Project directory not found!" -ForegroundColor Red
    Write-Host "Looking for: $projectPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $projectPath
Write-Host "✓ Changed to project directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found in project directory!" -ForegroundColor Red
    Write-Host "Current directory contents:" -ForegroundColor Yellow
    Get-ChildItem
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Found package.json" -ForegroundColor Green
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host "This will open your browser automatically" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

npm run dev

Write-Host ""
Write-Host "Development server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"
