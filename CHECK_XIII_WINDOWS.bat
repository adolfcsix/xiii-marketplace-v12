@echo off
cd /d "%~dp0"
title XIII Marketplace - Preflight
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\preflight.ps1"
pause
