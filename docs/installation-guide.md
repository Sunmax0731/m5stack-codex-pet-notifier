# 導入手順

## 必要環境

- Windows + PowerShell
- Node.js 24 以上
- npm 11 以上
- 実機確認時のみ PlatformIO と M5Unified / M5Stack board packages
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

closed alpha では動作 firmware を同梱します。Core2 target は `COM4` へ upload し、2.4GHz Wi-Fi、Host Bridge pairing、Codex relay answer 表示を確認対象にします。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray
```

PlatformIO を追加導入する場合は `C:\` ではなく `E:\DevEnv` 以下へ配置してください。

この環境では PlatformIO を `E:\DevEnv\PlatformIO\venv` に配置します。

```powershell
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4
```

repo root から実行する場合は `-d firmware` を付けます。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2 -t upload --upload-port COM4
```

Wi-Fi 設定は `firmware/include/wifi_config.local.h` を使います。`D:\AI\secure\ssid.txt` が 5GHz SSID を指している場合、M5Stack/ESP32 から見える 2.4GHz SSID に変換して local header に保存してください。

## Host Bridge

PC と M5Stack を同じ LAN に接続し、PC 側で Host Bridge を起動します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
```

別の PowerShell で sample event を送信します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/codex/replay-samples -ContentType application/json -Body '{"deviceId":"m5stack-sample-001"}'
Invoke-RestMethod -Uri http://127.0.0.1:8080/events
```

## Codex Relay

Codex の返答本文を Core2 に表示します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "Codexの返答本文"
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。Core2のAnswer画面で文字化けせずに表示されれば合格です。"
```
