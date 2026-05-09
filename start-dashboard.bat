@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\start-dashboard-hidden.ps1" -HostAddress "0.0.0.0" -Port 8080
endlocal
