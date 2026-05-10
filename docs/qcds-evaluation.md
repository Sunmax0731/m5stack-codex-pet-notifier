# QCDS Evaluation

QCDS は Quality、Cost、Delivery、Satisfaction として評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

## Current Grade

| Area | Grade | Reason |
| --- | --- | --- |
| Quality | S- | schema、LAN Host Bridge smoke、Dashboard smoke、Dashboard 最新 Codex 回答表示/送信 smoke、Decision request smoke、pet mood / gesture smoke、long press から Choice request への side effect、current pet preview smoke、Display `1..32` / render FPS / motion step 設定 smoke、M5Stack 表示プレビュー smoke、Codex relay smoke、Codex session smoke、Codex hook relay smoke、Codex app-server adapter smoke、adapter review、clipboard UTF-8 relay smoke、simulator、representative suite、runtime gate、security/privacy、Core2 upload / Wi-Fi / pairing / Codex answer 表示、日本語フォント対応、long-run source gate、signing readiness、hatch-pet asset gate、scale-specific pet frame source gate、pet render FPS / motion step / display scale source gate、M5Canvas Sprite buffer による pet-only redraw source gate、M5Stack Choice Gate 配布 docs が検証対象。長時間 soak、実署名、実 Codex App Server 接続は未確認のため S+ ではない |
| Cost | A+ | Node.js 標準ライブラリ中心の Host Bridge と PlatformIO firmware で導入負荷を抑えている |
| Delivery | A+ | docs、samples、schemas、runtime evidence、release notes、docs ZIP、Windows installer ZIP、redacted hardware evidence を prerelease へ出せる |
| Satisfaction | S- | 導入、操作、side menu 付き Dashboard GUI、状態確認のsidebar常時表示、独立Debug section削除、保守tabの重複削除、current pet を使う全幅 M5Stack 表示プレビュー、pet mood / latest interaction readout、項目ごとの統合RGBA picker、表示変更の自動送信、クリック式help icon、OS追従theme / light / dark、日英label切替、section collapse、setup command modal内のdebug送信、Dashboard での最新 Codex 回答表示と M5Stack 送信、Codex decision request、long press からの Choice request、Codex App Server adapter 準備、署名付き MSI / MSIX 準備、長時間運用 diagnostics、M5Stack Choice Gate 配布用 `AGENTS.md` / `SKILL.md`、Windows shortcut installer、hidden dashboard launcher、pet 表示倍率 / text size / render FPS / motion step 変更、Host Bridge 手動確認、Codex relay 手順、Codex session 自動送信手順、Codex Hooks 連携手順、日本語表示手順、hatch-pet asset 生成手順、残範囲が明確。Core2 / Dashboard の主要 UX はユーザー目視で確認済み。長時間 soak、実署名、実 Codex App Server 接続は未確認のため S+ ではない |

## Evidence

- `cmd.exe /d /s /c npm test`
- `dist/validation-result.json`
- `docs/platform-runtime-gate.json`
- `cmd.exe /d /s /c npm run bridge:smoke`
- `cmd.exe /d /s /c npm run dashboard:smoke`
- `cmd.exe /d /s /c npm run codex:answer -- --text "..."`
- `node scripts/codex-session-smoke.mjs`
- `cmd.exe /d /s /c npm run codex:app-server:smoke`
- `cmd.exe /d /s /c npm run adapter:review`
- `cmd.exe /d /s /c npm run installer:signing:check`
- `cmd.exe /d /s /c npm run codex:sessions -- --once --phase any`
- `cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001`
- `cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。"`
- `cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h`
- `cmd.exe /d /s /c npm run installer:package`
- `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- `cmd.exe /d /s /c npm run firmware:upload:core2`
- `docs/qcds-strict-metrics.json`
- `docs/manual-test.md`
- `docs/host-bridge-manual-check.md`
- `docs/codex-relay-manual-check.md`
- `docs/gui-tools-manual-check.md`
- `docs/hardware-runtime-evidence.json`
- `docs/releases/v0.2.0-beta.1.md`

## Manual Test Cap

Core2 の upload、Wi-Fi、pairing、Codex relay answer、A button reply、clipboard 日本語表示、file watch の Answer 画面表示、Dashboard GUI 表示、hatch-pet asset firmware upload に加え、Display 設定の固定ヘッダーテキスト削除 / pet `32/32` 超拡大表示 / pet X/Y drag offset / text size 変更 / render FPS / motion step 変更 / 文字背景 alpha 0 の透明表示 / Sprite buffer によるちらつき抑制 / hatch-pet row illustration 切替 / gesture / long press Choice request / installer shortcut / Dashboard 最新 Codex 回答送信 / Codex session auto relay / hook relay / Dashboard からの Decision / Pet 実機目視は、機能ブラッシュアップ時のユーザー確認で問題なしと報告済みです。GRAY 実機と GRAY IMU は release target 外です。長時間 soak、署名付き MSI / MSIX の実署名、実 Codex App Server 接続は未確認として残るため、`S+` は付けません。
