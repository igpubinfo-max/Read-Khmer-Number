@echo off
setlocal
title Khmer Amount Converter - Download Latest Android APK
cd /d "%~dp0"

echo ======================================================================
echo   FETCHING / DOWNLOADING LATEST KHMER AMOUNT CONVERTER APK
echo ======================================================================
echo.

node scripts/download-apk.js
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo ======================================================================
    echo   DOWNLOAD STOPPED WITH ERROR [Code: %EXIT_CODE%]
    echo ======================================================================
) else (
    echo ======================================================================
    echo   APK READY! OPENING FOLDER...
    echo ======================================================================
    explorer.exe /select,"%~dp0KhmerAmountConverter.apk"
)

pause
exit /b %EXIT_CODE%
