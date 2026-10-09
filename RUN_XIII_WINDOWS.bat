@echo off
setlocal
cd /d "%~dp0"
title XIII Marketplace - Local Development
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\start-local.ps1"
set CODE=%ERRORLEVEL%
echo.
if not "%CODE%"=="0" (
  echo XIII stopped with error code %CODE%.
  echo Run DIAGNOSE_XIII_WINDOWS.bat and send the generated diagnostics file.
) else (
  echo XIII development servers stopped.
)
pause
exit /b %CODE%
