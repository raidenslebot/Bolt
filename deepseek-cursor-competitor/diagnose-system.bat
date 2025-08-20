@echo off
cls
color 0E
echo.
echo ================================================================
echo   🔧 AUTONOMOUS AI SYSTEM - DIAGNOSTICS & TROUBLESHOOTING
echo ================================================================
echo   Comprehensive System Health Check and Problem Resolution
echo   Date: %date% Time: %time%
echo ================================================================
echo.

REM Set the script directory as the working directory
cd /d "%~dp0"

echo 📋 Starting Comprehensive System Diagnostics...
echo.

REM Function to check if a command exists
set "command_exists=0"

echo 🔍 Step 1: Environment Diagnostics
echo -----------------------------------

echo Checking operating system...
echo OS: %OS%
echo Architecture: %PROCESSOR_ARCHITECTURE%
echo Computer: %COMPUTERNAME%
echo User: %USERNAME%
echo.

echo Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js: NOT FOUND
    echo 📝 Solution: Install Node.js from https://nodejs.org/
    set "errors_found=1"
) else (
    echo ✅ Node.js: 
    node --version
    echo   Path: 
    where node 2>nul
)

echo.
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm: NOT FOUND
    set "errors_found=1"
) else (
    echo ✅ npm: 
    npm --version
)

echo.
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Git: NOT FOUND (optional but recommended)
    echo 📝 Solution: Install Git from https://git-scm.com/
) else (
    echo ✅ Git: 
    git --version
)

echo.
echo 📁 Step 2: Project Structure Validation
echo ----------------------------------------

echo Checking project files...

if not exist "package.json" (
    echo ❌ package.json: NOT FOUND
    echo 📝 Critical file missing. Ensure you're in the correct directory.
    set "errors_found=1"
) else (
    echo ✅ package.json: EXISTS
)

if not exist "src" (
    echo ❌ src directory: NOT FOUND
    echo 📝 Source directory is missing
    set "errors_found=1"
) else (
    echo ✅ src directory: EXISTS
    echo   Checking src subdirectories...
    if exist "src\main" (echo     ✅ src\main: EXISTS) else (echo     ❌ src\main: MISSING)
    if exist "src\renderer" (echo     ✅ src\renderer: EXISTS) else (echo     ❌ src\renderer: MISSING)
    if exist "src\preload" (echo     ✅ src\preload: EXISTS) else (echo     ❌ src\preload: MISSING)
)

if not exist "tsconfig.json" (
    echo ❌ tsconfig.json: NOT FOUND
    echo 📝 TypeScript configuration missing
    set "errors_found=1"
) else (
    echo ✅ tsconfig.json: EXISTS
)

if not exist "vite.config.ts" (
    echo ❌ vite.config.ts: NOT FOUND
    echo 📝 Vite configuration missing
    set "errors_found=1"
) else (
    echo ✅ vite.config.ts: EXISTS
)

echo.
echo 🔐 Step 3: Environment Configuration Check
echo ------------------------------------------

if not exist ".env" (
    echo ⚠️  .env: NOT FOUND
    echo 📝 Environment file missing. Checking for .env.example...
    if exist ".env.example" (
        echo ✅ .env.example: EXISTS
        echo 📝 Suggestion: Copy .env.example to .env and configure API keys
    ) else (
        echo ❌ .env.example: NOT FOUND
        echo 📝 No environment template found
    )
) else (
    echo ✅ .env: EXISTS
    echo   Checking environment variables...
    
    findstr /B "DEEPSEEK_API_KEY=" .env >nul 2>&1
    if %errorlevel% neq 0 (
        echo     ⚠️  DEEPSEEK_API_KEY: NOT SET
        echo     📝 Required for AI features
    ) else (
        echo     ✅ DEEPSEEK_API_KEY: SET
    )
    
    findstr /B "OPENAI_API_KEY=" .env >nul 2>&1
    if %errorlevel% neq 0 (
        echo     ⚠️  OPENAI_API_KEY: NOT SET (optional)
    ) else (
        echo     ✅ OPENAI_API_KEY: SET
    )
    
    findstr /B "ANTHROPIC_API_KEY=" .env >nul 2>&1
    if %errorlevel% neq 0 (
        echo     ⚠️  ANTHROPIC_API_KEY: NOT SET (optional)
    ) else (
        echo     ✅ ANTHROPIC_API_KEY: SET
    )
)

echo.
echo 📦 Step 4: Dependencies Analysis
echo --------------------------------

if not exist "node_modules" (
    echo ❌ node_modules: NOT FOUND
    echo 📝 Dependencies not installed
    echo 🔧 Solution: Run 'npm install'
    set "deps_missing=1"
) else (
    echo ✅ node_modules: EXISTS
    echo   Checking package-lock.json...
    if exist "package-lock.json" (
        echo   ✅ package-lock.json: EXISTS
    ) else (
        echo   ⚠️  package-lock.json: NOT FOUND
        echo   📝 Dependency lock file missing (may cause version conflicts)
    )
    
    echo   Checking critical dependencies...
    if exist "node_modules\electron" (
        echo     ✅ electron: INSTALLED
    ) else (
        echo     ❌ electron: MISSING
        set "deps_missing=1"
    )
    
    if exist "node_modules\react" (
        echo     ✅ react: INSTALLED
    ) else (
        echo     ❌ react: MISSING
        set "deps_missing=1"
    )
    
    if exist "node_modules\vite" (
        echo     ✅ vite: INSTALLED
    ) else (
        echo     ❌ vite: MISSING
        set "deps_missing=1"
    )
    
    if exist "node_modules\typescript" (
        echo     ✅ typescript: INSTALLED
    ) else (
        echo     ❌ typescript: MISSING
        set "deps_missing=1"
    )
)

echo.
echo 🏗️  Step 5: Build System Check
echo ------------------------------

if exist "dist" (
    echo ✅ dist directory: EXISTS
    echo   Checking build outputs...
    if exist "dist\main" (
        echo     ✅ dist\main: EXISTS
        if exist "dist\main\main.js" (
            echo       ✅ main.js: EXISTS
        ) else (
            echo       ❌ main.js: MISSING
            set "build_incomplete=1"
        )
    ) else (
        echo     ❌ dist\main: MISSING
        set "build_incomplete=1"
    )
    
    if exist "dist\renderer" (
        echo     ✅ dist\renderer: EXISTS
    ) else (
        echo     ❌ dist\renderer: MISSING
        set "build_incomplete=1"
    )
    
    if exist "dist\preload" (
        echo     ✅ dist\preload: EXISTS
        if exist "dist\preload\preload.js" (
            echo       ✅ preload.js: EXISTS
        ) else (
            echo       ❌ preload.js: MISSING
            set "build_incomplete=1"
        )
    ) else (
        echo     ❌ dist\preload: MISSING
        set "build_incomplete=1"
    )
) else (
    echo ⚠️  dist directory: NOT FOUND
    echo 📝 Application not built yet
    set "build_needed=1"
)

echo.
echo 🔧 Step 6: TypeScript Validation
echo --------------------------------

echo Running TypeScript type check...
npm run type-check >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ TypeScript errors found
    echo 📝 Running detailed type check...
    npm run type-check
    set "typescript_errors=1"
) else (
    echo ✅ TypeScript: No type errors found
)

echo.
echo 🧹 Step 7: Linting Check
echo ------------------------

echo Running ESLint...
npm run lint >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Linting issues found
    echo 📝 Run 'npm run lint:fix' to auto-fix issues
    set "linting_issues=1"
) else (
    echo ✅ ESLint: No linting errors found
)

echo.
echo 💾 Step 8: System Resources Check
echo ---------------------------------

echo Checking available disk space...
for /f "tokens=3" %%a in ('dir /-c ^| find "bytes free"') do (
    echo Available disk space: %%a bytes
)

echo.
echo Checking memory usage...
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /format:csv | findstr /v "Node" | findstr /v "^,"

echo.
echo 🌐 Step 9: Network Connectivity Check
echo -------------------------------------

echo Testing internet connectivity...
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Internet connectivity: FAILED
    echo 📝 Check your network connection
    set "network_issues=1"
) else (
    echo ✅ Internet connectivity: OK
)

echo Testing npm registry connectivity...
npm ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  npm registry: CONNECTION ISSUES
    echo 📝 May affect package installation
) else (
    echo ✅ npm registry: ACCESSIBLE
)

echo.
echo 📊 DIAGNOSTIC SUMMARY
echo =====================

if defined errors_found (
    echo ❌ CRITICAL ERRORS FOUND - System not ready
) else if defined deps_missing (
    echo ⚠️  DEPENDENCIES MISSING - Run installation
) else if defined build_incomplete (
    echo ⚠️  BUILD INCOMPLETE - Rebuild required
) else if defined typescript_errors (
    echo ⚠️  TYPESCRIPT ERRORS - Fix before running
) else (
    echo ✅ SYSTEM READY - All checks passed
)

echo.
echo 🔧 RECOMMENDED ACTIONS
echo ======================

if defined errors_found (
    echo 1. Install missing system requirements (Node.js, npm)
    echo 2. Ensure you're in the correct project directory
    echo 3. Verify project files are present
)

if defined deps_missing (
    echo 1. Install dependencies: npm install
    echo 2. Verify package.json is valid
    echo 3. Check internet connectivity for downloads
)

if defined build_needed (
    echo 1. Build the application: npm run build
    echo 2. Or start development: npm run dev
)

if defined build_incomplete (
    echo 1. Clean and rebuild: npm run build
    echo 2. Check for build errors in output
    echo 3. Verify all source files exist
)

if defined typescript_errors (
    echo 1. Fix TypeScript errors: npm run type-check
    echo 2. Check imports and type definitions
    echo 3. Ensure all required modules are installed
)

if defined linting_issues (
    echo 1. Auto-fix linting issues: npm run lint:fix
    echo 2. Manually review remaining issues
)

if defined network_issues (
    echo 1. Check internet connection
    echo 2. Verify firewall/proxy settings
    echo 3. Try using npm with different registry
)

echo.
echo 🚀 QUICK START COMMANDS
echo =======================
echo.
echo First time setup:
echo   1. npm install
echo   2. Copy .env.example to .env and configure API keys
echo   3. npm run build
echo   4. npm run dev
echo.
echo Development:
echo   npm run dev        - Start development servers
echo   npm run build      - Build for production
echo   npm run lint:fix   - Fix code style issues
echo   npm run type-check - Check TypeScript types
echo.
echo Troubleshooting:
echo   • Delete node_modules and run: npm install
echo   • Clear build: rmdir /s dist && npm run build
echo   • Reset everything: git clean -fdx && npm install
echo.

echo ================================================================
echo   🔧 DIAGNOSTICS COMPLETE
echo ================================================================
echo.

pause
