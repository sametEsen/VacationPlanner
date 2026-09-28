@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\deploy\windows\reset-server-dev-port.ps1"
if errorlevel 1 exit /b 1
npm run dev
