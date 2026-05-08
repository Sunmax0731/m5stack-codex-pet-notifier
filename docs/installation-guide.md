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

closed alpha では firmware scaffold を同梱します。実機 build / flash は未実施です。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
pio run -e m5stack-core2
pio run -e m5stack-gray
```

PlatformIO を追加導入する場合は `C:\` ではなく `E:\DevEnv` 以下へ配置してください。
