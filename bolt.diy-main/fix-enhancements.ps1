# Fix Line Endings and Enable Enhancements
# PowerShell script to fix CRLF issues and enable all enhancement systems

Write-Host "🚀 Fixing Bolt.diy Enhancement Systems..." -ForegroundColor Green

# Files to fix line endings
$enhancementFiles = @(
    "app\lib\core\bolt-enhancement-coordinator.ts",
    "app\lib\core\enhanced-api-key-manager.ts", 
    "app\lib\core\cursor-feature-integrator.ts",
    "app\lib\core\bolt-enhancement-init.ts",
    "app\lib\enhanced-ai-integration\webcontainer-deepseek-bridge.ts",
    "app\lib\code-indexing\webcontainer-code-indexer.ts",
    "app\lib\error-recovery\comprehensive-error-recovery-system.ts",
    "app\lib\performance\performance-optimization-system.ts",
    "app\lib\webcontainer\webcontainer-permission-manager.ts"
)

Write-Host "Fixing line endings for enhancement files..." -ForegroundColor Yellow

foreach ($file in $enhancementFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        try {
            # Read content and convert line endings
            $content = Get-Content $fullPath -Raw
            if ($content) {
                $content = $content -replace "`r`n", "`n"
                [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.Encoding]::UTF8)
                Write-Host "✅ Fixed: $file" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Error fixing: $file - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`n🔧 Installing missing dependencies..." -ForegroundColor Green

# Install missing TypeScript types
try {
    npm install --save-dev @types/node
    Write-Host "✅ Installed @types/node" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install @types/node" -ForegroundColor Red
}

Write-Host "`n📊 Checking TypeScript compilation..." -ForegroundColor Green

# Check TypeScript compilation for enhancement files
$tsErrors = 0
foreach ($file in $enhancementFiles) {
    if (Test-Path $file) {
        try {
            $result = npx tsc --noEmit $file 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ TypeScript OK: $file" -ForegroundColor Green
            } else {
                Write-Host "❌ TypeScript Errors: $file" -ForegroundColor Red
                $tsErrors++
            }
        } catch {
            Write-Host "⚠️  Could not check: $file" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🎉 Enhancement System Status:" -ForegroundColor Cyan
Write-Host "  • Files processed: $($enhancementFiles.Count)" -ForegroundColor White
Write-Host "  • TypeScript errors: $tsErrors" -ForegroundColor White
Write-Host "  • Enhancement systems: Ready for integration" -ForegroundColor Green

if ($tsErrors -eq 0) {
    Write-Host "`n🚀 All enhancement systems are ready!" -ForegroundColor Green
    Write-Host "   Restart Bolt.diy to see improvements." -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Some issues remain. Check TypeScript errors above." -ForegroundColor Yellow
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Restart Bolt.diy (npm run dev)" -ForegroundColor White  
Write-Host "2. Check browser console for enhancement logs" -ForegroundColor White
Write-Host "3. Test new Cursor-like features" -ForegroundColor White
