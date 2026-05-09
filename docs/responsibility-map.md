# Responsibility Map

| Module | Owns | Does Not Own |
| --- | --- | --- |
| `src/host-adapter` | pairing、token、event route、mock Codex adapter | Codex App 内部 API 固定実装 |
| `src/host-bridge` | HTTP API、Dashboard GUI、debug snapshot、redacted event log | LAN 外公開、秘密情報保存 |
| `src/host-bridge/dashboard/display-utils.js` | Dashboard preview の RGBA 合成、swatch 更新、mood fallback | API通信、DOM全体の状態管理 |
| `src/protocol` | schema validation、warning、scroll model | network transport |
| `src/core/pet-mood.mjs` | pet mood / state の正規化と fallback | UI描画、transport |
| `src/device-adapter` | Core2 / GRAY profile と input map | 実機 driver の詳細 |
| `src/simulator` | screen state、reply、interaction、heartbeat | M5Stack hardware access |
| `firmware` | M5Unified scaffold と target split | 実機検証済み binary 配布 |
| `tools` | runtime gate、QCDS guard、release readiness、installer zip packaging | 手動実機テストの代替 |
| `installer` | Windows user-local shortcut installer | 署名付き MSI / MSIX、Node.js の同梱 |
| `docs` | 要件、仕様、導入、手動テスト、release evidence | 秘密情報や実会話ログ |
