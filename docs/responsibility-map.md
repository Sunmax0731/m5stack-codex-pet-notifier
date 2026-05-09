# Responsibility Map

| Module | Owns | Does Not Own |
| --- | --- | --- |
| `src/host-adapter` | pairing、token、event route、mock Codex adapter | Codex App 内部 API 固定実装 |
| `src/host-bridge` | HTTP API、Dashboard GUI、debug snapshot、redacted event log | LAN 外公開、秘密情報保存 |
| `src/protocol` | schema validation、warning、scroll model | network transport |
| `src/device-adapter` | Core2 / GRAY profile と input map | 実機 driver の詳細 |
| `src/simulator` | screen state、reply、interaction、heartbeat | M5Stack hardware access |
| `firmware` | M5Unified scaffold と target split | 実機検証済み binary 配布 |
| `tools` | runtime gate、QCDS guard、release readiness | 手動実機テストの代替 |
| `docs` | 要件、仕様、導入、手動テスト、release evidence | 秘密情報や実会話ログ |
