param(
  [string]$HostAddress = "0.0.0.0",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "tmp"
$logPath = Join-Path $logDir "dashboard-launch.log"
New-Item -ItemType Directory -Force $logDir | Out-Null

try {
  $npm = Get-Command npm -ErrorAction Stop
  $package = Get-Content -Encoding UTF8 (Join-Path $repoRoot "package.json") | ConvertFrom-Json
  $expectedVersion = [string]$package.version
  $candidatePorts = @($Port) + (18081..18095 | Where-Object { $_ -ne $Port })
  $selected = $null
  $attempts = @()

  foreach ($candidatePort in $candidatePorts) {
    $candidateUrl = "http://127.0.0.1:$candidatePort/"
    $arguments = "/d /s /c npm run bridge:start:bg -- --host=$HostAddress --port=$candidatePort"
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) {
      $attempts += "port=$candidatePort exit=$($process.ExitCode)"
      continue
    }

    try {
      $health = Invoke-RestMethod -Uri "${candidateUrl}health" -TimeoutSec 2
      $attempts += "port=$candidatePort version=$($health.version)"
      if ($health.ok -and $health.version -eq $expectedVersion) {
        $selected = @{
          Port = $candidatePort
          Url = $candidateUrl
          Health = $health
        }
        break
      }
    } catch {
      $attempts += "port=$candidatePort health=$($_.Exception.Message)"
    }
  }

  if (-not $selected) {
    throw "No dashboard Bridge for version $expectedVersion could be started. Attempts: $($attempts -join '; ')"
  }

  Start-Process $selected.Url | Out-Null
  @(
    "started=$(Get-Date -Format o)"
    "repo=$repoRoot"
    "npm=$($npm.Source)"
    "expectedVersion=$expectedVersion"
    "port=$($selected.Port)"
    "url=$($selected.Url)"
    "attempts=$($attempts -join '; ')"
  ) | Set-Content -Encoding UTF8 $logPath
} catch {
  $dashboardUrl = "http://127.0.0.1:$Port/"
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
