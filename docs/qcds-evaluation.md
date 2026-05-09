# QCDS Evaluation

QCDS は Quality、Cost、Delivery、Satisfaction として評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

## Current Grade

| Area | Grade | Reason |
| --- | --- | --- |
| Quality | S- | schema、LAN Host Bridge smoke、Codex relay smoke、clipboard UTF-8 relay smoke、simulator、representative suite、runtime gate、security/privacy、Core2 upload / Wi-Fi / pairing / Codex answer 表示、日本語フォント対応が検証対象。GRAY 実機と長時間運用は未確認のため S+ ではない |
| Cost | A+ | Node.js 標準ライブラリ中心の Host Bridge と PlatformIO firmware で導入負荷を抑えている |
| Delivery | A+ | docs、samples、schemas、runtime evidence、release notes、docs ZIP、redacted hardware evidence を prerelease へ出せる |
| Satisfaction | S- | 導入、操作、Host Bridge 手動確認、Codex relay 手順、日本語表示手順、残範囲が明確。clipboard 日本語表示はユーザー目視で確認済み。長時間 UX が未確認のため S+ ではない |

## Evidence

- `cmd.exe /d /s /c npm test`
- `dist/validation-result.json`
- `docs/platform-runtime-gate.json`
- `cmd.exe /d /s /c npm run bridge:smoke`
- `cmd.exe /d /s /c npm run codex:answer -- --text "..."`
- `cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。"`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4`
- `docs/qcds-strict-metrics.json`
- `docs/manual-test.md`
- `docs/host-bridge-manual-check.md`
- `docs/codex-relay-manual-check.md`
- `docs/hardware-runtime-evidence.json`
- `docs/releases/v0.1.0-alpha.5.md`

## Manual Test Cap

Core2 の upload、Wi-Fi、pairing、Codex relay answer、A button reply、clipboard 日本語表示は確認対象です。GRAY 実機、長時間運用、実 Codex App 内部 API 連携は対象外です。残範囲があるため `S+` は付けません。
