@echo off
cd /d "%~dp0"
title XIII Marketplace - RESET LOCAL DATA
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\stop-infra.ps1" -ResetData
pause
