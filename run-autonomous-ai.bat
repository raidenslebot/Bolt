@echo off
title Autonomous AI System
echo ================================================
echo       AUTONOMOUS AI SYSTEM LAUNCHER
echo ================================================
echo.
echo Current Location: %CD%
echo Batch File Location: %~dp0
echo.
echo Changing to project directory...
pushd "%~dp0deepseek-cursor-competitor"
echo New Location: %CD%
echo.

echo Checking if package.json exists...
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Current directory: %CD%
    echo Contents:
    dir
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

echo ✓ Found package.json
echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed!
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

echo.
echo ✓ Dependencies installed successfully
echo.
echo Starting development server...
echo This will open your browser automatically
echo Press Ctrl+C to stop the server
echo.
call npm run dev
echo.
echo Development server stopped.
echo Press any key to exit...
pause > nul
