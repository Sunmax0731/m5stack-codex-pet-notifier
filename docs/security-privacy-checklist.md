# Security / Privacy Checklist

## Boundary

| Item | Status | Evidence |
| --- | --- | --- |
| LAN 内利用を前提にする | Pass | Host Bridge は local LAN mock として分離 |
| pairing token を必須にする | Pass | `LocalLanBridge.checkToken()` |
| token なし / 誤 token を拒否する | Pass | `happy-path.unauthorizedRejected=1` |
| device に本文を永続保存しない | Pass | `sample-telemetry.json`、`persistentMessageBodies=false` |
| 個人 pet sprite を release asset に含めない | Pass | sample は `host://` 参照のみ |
| Codex App 内部 API に固定依存しない | Pass | `MockCodexAdapter` と protocol 境界 |
| 実機 Wi-Fi の安全設定確認 | Not run | 手動テストへ残す |

## Release Asset Rules

- `dist/m5stack-codex-pet-notifier-docs.zip` には docs、samples、schemas のみを含める。
- token、host IP、実会話本文、個人 pet sprite、`.env` は含めない。
- 実機ログを共有する場合は SSID、IP、token、会話本文を削除する。
