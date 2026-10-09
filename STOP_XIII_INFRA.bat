@echo off
cd /d "%~dp0"
title XIII Marketplace - Stop Infrastructure
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\stop-infra.ps1"
pause
