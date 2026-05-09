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
- Dashboard Choice / Pet endpoint と GUI smoke。
- Dashboard Display endpoint と pet 表示倍率 / text size controls。
- Core2 hatch-pet asset animation の firmware 対応と upload。
- Core2 固定ヘッダーテキスト削除、pet `1..8` 表示面積、dynamic display settings の firmware 対応。
- Core2 scale-specific pet asset frame selection。
- Dashboard side menu、event tabs、M5Stack 表示プレビュー。
- Runtime gate。
- Security/privacy checklist。
- QCDS metrics。
- Release notes と docs ZIP。

## Not Ready for Stable

- GRAY 実機 firmware flash。
- 長時間 Wi-Fi 再接続。
- Core2 touch / swipe の物理 UX。
- Core2 日本語 glyph のユーザー目視確認。
- Dashboard からの Choice / hatch-pet animation 実機目視確認。
- Codex session auto relay の Core2 実機目視確認。
- Codex hook relay の Core2 実機目視確認。
- Dashboard 最新 Codex 回答送信の Core2 実機目視確認。
- Display 設定による固定ヘッダーテキスト削除、pet `8/8` 最大表示、text size 変更の Core2 実機目視確認。
- GRAY button / IMU の物理 UX。
- 実 Codex App 内部 API 連携。

## Decision

`v0.1.0-alpha.5` は closed alpha prerelease として公開し、stable release にはしません。
