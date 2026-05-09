@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" -LaunchAfterInstall
if errorlevel 1 (
  echo Installer failed. Check Node.js/npm and the install log shown above.
  pause
  exit /b 1
)
endlocal
