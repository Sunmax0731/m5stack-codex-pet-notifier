# m5stack-codex-pet-notifier

M5Stack Core2 / GRAY を Codex App の卓上ペット通知端末として使うための closed alpha prototype です。PC 側の Host Bridge が Codex の状態を LAN 内イベントへ変換し、M5Stack 側は安定した JSON event contract だけを処理します。

## Status

- Version: `0.1.0-alpha.1`
- Domain: IoT
- Idea No: 18
- Runtime gate: simulator / mock device / sample telemetry / host adapter / device adapter / security boundary
- Manual hardware test: Core2 target を `COM4` へ upload 済み。M5Stack が 2.4GHz LAN に接続することを serial log で確認済み
- Release channel: GitHub prerelease

## MVP

- `schemas/events/*.json` で pet、通知、回答、選択肢、返信、heartbeat のイベント契約を定義する。
- `src/host-adapter/localLanBridge.mjs` で pairing token、device 登録、LAN 境界、device event 受信を検証する。
- `src/simulator/mockDevice.mjs` で Core2 / GRAY profile の画面遷移、長文回答のページング、返信、pet interaction を再現する。
- `samples/representative-suite.json` で happy path、必須項目欠落、warning、mixed batch を代表シナリオとして検証する。
- `firmware/` に M5Unified 前提の Core2 / GRAY firmware scaffold を置く。

## Commands

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm test
cmd.exe /d /s /c npm run demo
```

`npm test` は `docs/platform-runtime-gate.json`、`dist/validation-result.json`、`docs/qcds-regression-baseline.json`、`dist/m5stack-codex-pet-notifier-docs.zip` を生成または更新します。

## Local Wi-Fi Config

`D:\AI\secure\ssid.txt` は Git に入れません。M5Stack/ESP32 は 2.4GHz Wi-Fi のみ対応するため、5GHz SSID が記載されている場合は device scan で見つかった対応 2.4GHz SSID を `firmware/include/wifi_config.local.h` に設定します。この local header は `.gitignore` 対象です。

## Documents

- [requirements.md](docs/requirements.md)
- [specification.md](docs/specification.md)
- [design.md](docs/design.md)
- [architecture.md](docs/architecture.md)
- [implementation-plan.md](docs/implementation-plan.md)
- [test-plan.md](docs/test-plan.md)
- [manual-test.md](docs/manual-test.md)
- [installation-guide.md](docs/installation-guide.md)
- [user-guide.md](docs/user-guide.md)
- [security-privacy-checklist.md](docs/security-privacy-checklist.md)
- [competitive-benchmark.md](docs/competitive-benchmark.md)
- [qcds-evaluation.md](docs/qcds-evaluation.md)
- [releases/v0.1.0-alpha.1.md](docs/releases/v0.1.0-alpha.1.md)

## Closed Alpha Boundary

この release は simulator と mock device で runtime gate を通した検証版です。現在の main では Core2 target の firmware 書き込みと Wi-Fi 接続まで確認済みです。touch、button、IMU、GRAY target、実 Codex adapter は未確認のため、安定版ではなく prerelease として扱います。
