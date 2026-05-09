# QCDS Evaluation

QCDS は Quality、Cost、Delivery、Satisfaction として評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

## Current Grade

| Area | Grade | Reason |
| --- | --- | --- |
| Quality | S- | schema、LAN Host Bridge smoke、Dashboard smoke、Dashboard 最新 Codex 回答表示/送信 smoke、Display 設定 smoke、Codex relay smoke、Codex session smoke、Codex hook relay smoke、clipboard UTF-8 relay smoke、simulator、representative suite、runtime gate、security/privacy、Core2 upload / Wi-Fi / pairing / Codex answer 表示、日本語フォント対応、hatch-pet asset gate、pet animation / display scale source gate が検証対象。GRAY 実機と長時間運用は未確認のため S+ ではない |
| Cost | A+ | Node.js 標準ライブラリ中心の Host Bridge と PlatformIO firmware で導入負荷を抑えている |
| Delivery | A+ | docs、samples、schemas、runtime evidence、release notes、docs ZIP、redacted hardware evidence を prerelease へ出せる |
| Satisfaction | S- | 導入、操作、Dashboard GUI、Dashboard での最新 Codex 回答表示と M5Stack 送信、pet 表示倍率 / text size 変更、Host Bridge 手動確認、Codex relay 手順、Codex session 自動送信手順、Codex Hooks 連携手順、日本語表示手順、hatch-pet asset 生成手順、残範囲が明確。clipboard 日本語表示と file watch の Answer 画面表示はユーザー目視で確認済み。Display 設定の実機目視、Dashboard 最新回答送信の実機目視、Codex session auto relay / hook relay、Dashboard からの ABC 返信、hatch-pet animation の最終目視は手動確認対象のため S+ ではない |

## Evidence

- `cmd.exe /d /s /c npm test`
- `dist/validation-result.json`
- `docs/platform-runtime-gate.json`
- `cmd.exe /d /s /c npm run bridge:smoke`
- `cmd.exe /d /s /c npm run dashboard:smoke`
- `cmd.exe /d /s /c npm run codex:answer -- --text "..."`
- `node scripts/codex-session-smoke.mjs`
- `cmd.exe /d /s /c npm run codex:sessions -- --once --phase any`
- `cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001`
- `cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。"`
- `cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4`
- `docs/qcds-strict-metrics.json`
- `docs/manual-test.md`
- `docs/host-bridge-manual-check.md`
- `docs/codex-relay-manual-check.md`
- `docs/gui-tools-manual-check.md`
- `docs/hardware-runtime-evidence.json`
- `docs/releases/v0.1.0-alpha.5.md`

## Manual Test Cap

Core2 の upload、Wi-Fi、pairing、Codex relay answer、A button reply、clipboard 日本語表示、file watch の Answer 画面表示、Dashboard GUI 表示、hatch-pet asset firmware upload は確認対象です。Display 設定の実機目視、Dashboard 最新 Codex 回答送信、Codex session auto relay / hook relay、Dashboard からの Choice / Pet 実機目視、GRAY 実機、長時間運用、実 Codex App 内部 API 連携は対象外または手動確認待ちです。残範囲があるため `S+` は付けません。
