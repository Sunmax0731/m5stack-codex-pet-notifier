param(
  [switch]$LaunchAfterInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$productName = "M5Stack Codex Pet Notifier"
$installRoot = Join-Path $env:LOCALAPPDATA "M5StackCodexPetNotifier"
$startBatch = Join-Path $repoRoot "start-dashboard.bat"
$manifestPath = Join-Path $installRoot "install.json"

function New-Shortcut {
  param(
    [string]$Path,
    [string]$Target,
    [string]$WorkingDirectory,
    [string]$Description
  )
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Target
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.Description = $Description
  $shortcut.Save()
}

New-Item -ItemType Directory -Force $installRoot | Out-Null
$npm = Get-Command npm -ErrorAction Stop
$node = Get-Command node -ErrorAction Stop

$desktop = [Environment]::GetFolderPath("DesktopDirectory")
$programs = [Environment]::GetFolderPath("Programs")
$startMenuDir = Join-Path $programs $productName
New-Item -ItemType Directory -Force $startMenuDir | Out-Null

New-Shortcut `
  -Path (Join-Path $desktop "$productName.lnk") `
  -Target $startBatch `
  -WorkingDirectory $repoRoot `
  -Description "Start the M5Stack Codex Pet local dashboard"

New-Shortcut `
  -Path (Join-Path $startMenuDir "$productName.lnk") `
  -Target $startBatch `
  -WorkingDirectory $repoRoot `
  -Description "Start the M5Stack Codex Pet local dashboard"

New-Shortcut `
  -Path (Join-Path $startMenuDir "User Guide.lnk") `
  -Target (Join-Path $repoRoot "docs\user-guide.md") `
  -WorkingDirectory $repoRoot `
  -Description "Open the product user guide"

$manifest = [ordered]@{
  product = "m5stack-codex-pet-notifier"
  installRoot = $installRoot
  repoRoot = $repoRoot
  startBatch = $startBatch
  dashboardUrl = "http://127.0.0.1:8080/"
  node = $node.Source
  npm = $npm.Source
  installedAt = (Get-Date).ToString("o")
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $manifestPath

Write-Host "$productName installer completed."
Write-Host "Dashboard launcher: $startBatch"
Write-Host "Install manifest: $manifestPath"

if ($LaunchAfterInstall) {
  Start-Process -FilePath $startBatch -WorkingDirectory $repoRoot | Out-Null
}
