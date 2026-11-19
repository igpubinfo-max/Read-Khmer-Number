@echo off
setlocal
title Khmer Amount Converter - 1. Create Android APK
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-and-download-apk.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo ======================================================================
    echo   APK BUILD STOPPED WITH ERROR [Code: %EXIT_CODE%]
    echo ======================================================================
) else (
    echo ======================================================================
    echo   APK READY TO INSTALL ON ANDROID!
    echo ======================================================================
)

pause
exit /b %EXIT_CODE%
