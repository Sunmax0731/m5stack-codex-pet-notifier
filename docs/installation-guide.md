# 導入手順

## 必要環境

- Windows + PowerShell
- Node.js 24 以上
- npm 11 以上
- 実機確認時のみ PlatformIO または Arduino IDE と M5Unified
- 対象 device: M5Stack Core2 / M5Stack GRAY

## 自動検証

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm test
```

期待結果:

- `platform runtime gate passed for m5stack-codex-pet-notifier`
- `validated m5stack-codex-pet-notifier`
- `closed alpha guard passed for m5stack-codex-pet-notifier`
- `dist/validation-result.json` と `dist/m5stack-codex-pet-notifier-docs.zip` が生成される。

## Demo

```powershell
cmd.exe /d /s /c npm run demo
```

期待結果: `happy-path` の scenario summary が JSON で表示され、`status` が `passed` になる。

## Firmware

closed alpha では firmware scaffold を同梱します。Core2 target は `COM4` へ upload し、2.4GHz Wi-Fi 接続を確認済みです。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
pio run -e m5stack-core2
pio run -e m5stack-gray
```

PlatformIO を追加導入する場合は `C:\` ではなく `E:\DevEnv` 以下へ配置してください。

この環境では PlatformIO を `E:\DevEnv\PlatformIO\venv` に配置します。

```powershell
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4
```

Wi-Fi 設定は `firmware/include/wifi_config.local.h` を使います。`D:\AI\secure\ssid.txt` が 5GHz SSID を指している場合、M5Stack/ESP32 から見える 2.4GHz SSID に変換して local header に保存してください。
