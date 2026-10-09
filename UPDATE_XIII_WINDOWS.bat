@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\windows\start-local.ps1 -SkipSeed %*
pause
