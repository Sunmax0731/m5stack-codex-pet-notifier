# QCDS Evaluation

QCDS は Quality、Cost、Delivery、Satisfaction として評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

## Current Grade

| Area | Grade | Reason |
| --- | --- | --- |
| Quality | S- | schema、LAN Host Bridge smoke、simulator、representative suite、runtime gate、security/privacy、Core2 upload / Wi-Fi / pairing / sample poll が検証対象。物理入力と GRAY 実機未確認のため S+ ではない |
| Cost | A+ | Node.js 標準ライブラリ中心の Host Bridge と PlatformIO firmware で導入負荷を抑えている |
| Delivery | A+ | docs、samples、schemas、runtime evidence、release notes、docs ZIP、redacted hardware evidence を prerelease へ出せる |
| Satisfaction | S- | 導入、操作、Host Bridge 手動確認、未実施範囲、次の手動テストが明確。物理 UX 未確認のため S+ ではない |

## Evidence

- `cmd.exe /d /s /c npm test`
- `dist/validation-result.json`
- `docs/platform-runtime-gate.json`
- `cmd.exe /d /s /c npm run bridge:smoke`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4`
- `docs/qcds-strict-metrics.json`
- `docs/manual-test.md`
- `docs/host-bridge-manual-check.md`
- `docs/hardware-runtime-evidence.json`
- `docs/releases/v0.1.0-alpha.2.md`

## Manual Test Cap

Core2 の upload、Wi-Fi、pairing、sample poll は Codex で確認対象です。GRAY 実機、物理 A/B/C、Core2 touch、GRAY IMU、実 Codex adapter の手動テストは Codex では未実施です。手動未実施範囲が残るため `S+` は付けません。
