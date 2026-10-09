@echo off
setlocal
cd /d "%~dp0"
title XIII Marketplace - Browser E2E
if not exist node_modules (
  echo node_modules not found. Run RUN_XIII_WINDOWS.bat once or npm install first.
  pause
  exit /b 1
)
call npm run e2e:install
if errorlevel 1 goto :fail
call npm run e2e:stack
if errorlevel 1 goto :fail
echo.
echo E2E PASS.
pause
exit /b 0
:fail
echo.
echo E2E FAILED. Run: npm run e2e:report
pause
exit /b 1
