# Pre-release Readiness

## Ready

- Host Bridge mock。
- LAN Host Bridge server。
- Codex relay。
- Codex session auto relay。
- Codex hook relay。
- Host Bridge Dashboard GUI。
- Dashboard 最新 Codex session 回答表示と M5Stack 送信。
- Clipboard UTF-8 relay。
- JSON event contract。
- Core2 / GRAY device profile。
- Simulator と representative suite。
- Core2 / GRAY firmware build。
- Core2 upload、Wi-Fi、pairing、sample event poll。
- Core2 Codex answer 表示。
- Core2 日本語 answer 表示の firmware 対応。
- Dashboard Decision / Pet endpoint と GUI smoke。
- Dashboard Display endpoint と pet 表示倍率 / text size / render FPS / motion step controls。
- Pet mood / expression contract と Core2 touch gesture event。
- Long press / button long press から Codex decision request を queue する Host Bridge side effect。
- Windows user-local installer package と background dashboard launcher。
- Dashboard current pet preview、tooltip、section collapse、setup command modal。
- Core2 hatch-pet asset animation の firmware 対応と upload。
- Core2 固定ヘッダーテキスト削除、pet `1..32` 表示面積、`4..20fps` render、`120..800ms` motion step、dynamic display settings の firmware 対応。
- Core2 scale-specific pet asset frame selection。
- Core2 Sprite buffer による pet surface redraw と本文 overlay の安定表示。
- Dashboard side menu、状態確認sidebar、全幅M5Stack 表示プレビュー、最近の回答 / イベントログの左右ペイン。
- Core2 / Dashboard の機能ブラッシュアップ手動確認。日本語表示、Display 設定、pet 位置 / scale / RGBA、hatch-pet row illustration、gesture、Decision、最新 Codex 回答送信、installer shortcut、background launcher はユーザー確認済み。
- Runtime gate。
- Security/privacy checklist。
- QCDS metrics。
- Release notes と docs ZIP。

## Not Ready for Stable

- GRAY 実機 firmware flash。
- 長時間 Wi-Fi 再接続。
- GRAY button / IMU の物理 UX。
- 署名付き MSI / MSIX installer。
- 複数 M5Stack 同時接続。
- 実 Codex App 公開 API 連携。

## Decision

`v0.2.0-beta.1` は beta prerelease として公開し、stable release にはしません。Core2 / Dashboard の主要 UX はユーザー確認済みですが、GRAY 実機、長時間運用、複数端末、署名付き installer、実 Codex 公開 API の運用確認が残るため stable には上げません。
