@echo off
setlocal
cd /d "%~dp0"
echo Starting M5Stack Codex Pet dashboard...
cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080
if errorlevel 1 (
  echo Failed to start Host Bridge. Check Node.js, npm, and port 8080.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8080/"
echo Dashboard opened at http://127.0.0.1:8080/
timeout /t 3 >nul
endlocal
