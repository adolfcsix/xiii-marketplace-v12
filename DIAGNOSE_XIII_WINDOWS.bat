@echo off
cd /d "%~dp0"
title XIII Marketplace - Diagnostics
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\diagnose-local.ps1"
pause
