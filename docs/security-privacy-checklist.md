# Security / Privacy Checklist

## Boundary

| Item | Status | Evidence |
| --- | --- | --- |
| LAN 内利用を前提にする | Pass | Host Bridge は `0.0.0.0:8080` で LAN 手動確認用に起動し、外部公開を対象外にする |
| pairing token を必須にする | Pass | `LocalLanBridge.checkToken()`、`LanHostBridge.checkToken()` |
| token なし / 誤 token を拒否する | Pass | `happy-path.unauthorizedRejected=1`、`bridge:smoke` |
| device に本文を永続保存しない | Pass | `sample-telemetry.json`、`persistentMessageBodies=false` |
| 個人 pet sprite を release asset に含めない | Pass | sample は `host://` 参照のみ |
| Codex App 内部 API に固定依存しない | Pass | `MockCodexAdapter` と protocol 境界 |
| 実機 Wi-Fi の安全設定確認 | Partial pass | SSID / password は ignored local header のみ。公開証跡は redacted |

## Release Asset Rules

- `dist/m5stack-codex-pet-notifier-docs.zip` には README、docs、samples、schemas を含める。
- local Wi-Fi config を含めて build した firmware binary は SSID / password / local host IP を含む可能性があるため release asset にしない。
- token、host IP、実会話本文、個人 pet sprite、`.env` は含めない。
- 実機ログを共有する場合は SSID、IP、token、会話本文を削除する。
