param(
  [string]$HostAddress = "0.0.0.0",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:$Port/"
$logDir = Join-Path $repoRoot "tmp"
$logPath = Join-Path $logDir "dashboard-launch.log"
New-Item -ItemType Directory -Force $logDir | Out-Null

try {
  $npm = Get-Command npm -ErrorAction Stop
  $arguments = "/d /s /c npm run bridge:start:bg -- --host=$HostAddress --port=$Port"
  $process = Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    throw "bridge:start:bg failed with exit code $($process.ExitCode)"
  }
  Start-Process $dashboardUrl | Out-Null
  @(
    "started=$(Get-Date -Format o)"
    "repo=$repoRoot"
    "npm=$($npm.Source)"
    "url=$dashboardUrl"
  ) | Set-Content -Encoding UTF8 $logPath
} catch {
  @(
    "failed=$(Get-Date -Format o)"
    "repo=$repoRoot"
    "url=$dashboardUrl"
    "error=$($_.Exception.Message)"
  ) | Set-Content -Encoding UTF8 $logPath
  Start-Process "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Write-Host 'M5Stack Codex Pet dashboard failed to start.'; Write-Host 'Log: $logPath'; Get-Content -Encoding UTF8 '$logPath'; pause"
  ) | Out-Null
  exit 1
}
