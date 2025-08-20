@echo off
echo Starting Autonomous AI System...
echo.
echo Current directory: %CD%
echo Batch file location: %~dp0
echo.
cd /d "%~dp0"
echo Changed to: %CD%
echo.
echo Installing dependencies...
npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed!
    echo Make sure Node.js is installed and you're in the right directory.
    pause
    exit /b 1
)
echo.
echo Starting development server...
npm run dev
if errorlevel 1 (
    echo.
    echo ERROR: npm run dev failed!
    echo Check the error messages above.
    pause
    exit /b 1
)
pause
