param(
  [string]$Environment = "m5stack-core2",
  [string]$UploadPort = "",
  [string]$Pio = "E:\DevEnv\PlatformIO\venv\Scripts\pio.exe"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$firmwareRoot = Join-Path $repoRoot "firmware"

if (-not (Test-Path -LiteralPath $Pio)) {
  throw "PlatformIO executable not found: $Pio"
}

function Get-M5StackSerialPort {
  $ports = @(Get-CimInstance Win32_SerialPort | Where-Object {
    $_.DeviceID -match '^COM\d+$' -and
    $_.Name -notmatch 'Bluetooth' -and
    $_.Description -notmatch 'Bluetooth'
  })

  $preferred = @($ports | Where-Object {
    $_.Name -match 'CP210|CH340|CH910|USB.*UART|USB.*Serial|M5Stack|Espressif' -or
    $_.Description -match 'CP210|CH340|CH910|USB.*UART|USB.*Serial|M5Stack|Espressif' -or
    $_.PNPDeviceID -match 'VID_10C4|VID_1A86|VID_0403|VID_303A'
  })
  $usbPorts = @($ports | Where-Object {
    $_.PNPDeviceID -match '^USB\\'
  })

  if ($preferred.Count -eq 1) {
    return $preferred[0].DeviceID
  }

  if ($preferred.Count -gt 1) {
    Write-Host "Multiple USB serial ports were found:" -ForegroundColor Yellow
    $preferred | ForEach-Object {
      Write-Host ("  {0}  {1}" -f $_.DeviceID, $_.Name)
    }
    throw "Specify the target explicitly: npm run firmware:upload:core2 -- -UploadPort COMx"
  }

  if ($usbPorts.Count -eq 1) {
    return $usbPorts[0].DeviceID
  }

  if ($usbPorts.Count -gt 1) {
    Write-Host "Multiple USB serial ports were found:" -ForegroundColor Yellow
    $usbPorts | ForEach-Object {
      Write-Host ("  {0}  {1}" -f $_.DeviceID, $_.Name)
    }
    throw "Specify the target explicitly: npm run firmware:upload:core2 -- -UploadPort COMx"
  }

  Write-Host "Detected serial ports:" -ForegroundColor Yellow
  if ($ports.Count -eq 0) {
    Write-Host "  none"
  } else {
    $ports | ForEach-Object {
      Write-Host ("  {0}  {1}" -f $_.DeviceID, $_.Name)
    }
  }
  throw "No M5Stack USB serial port was detected. Reconnect the device or specify -UploadPort COMx."
}

if ([string]::IsNullOrWhiteSpace($UploadPort)) {
  $UploadPort = Get-M5StackSerialPort
}

Write-Host ("Uploading {0} to {1}" -f $Environment, $UploadPort)
& $Pio run -d $firmwareRoot -e $Environment -t upload --upload-port $UploadPort
exit $LASTEXITCODE
