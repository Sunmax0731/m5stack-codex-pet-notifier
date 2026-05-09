# Security / Privacy Checklist

## Boundary

| Item | Status | Evidence |
| --- | --- | --- |
| LAN 内利用を前提にする | Pass | Host Bridge は `0.0.0.0:8080` で LAN 手動確認用に起動し、外部公開を対象外にする |
| pairing token を必須にする | Pass | `LocalLanBridge.checkToken()`、`LanHostBridge.checkToken()` |
| token なし / 誤 token を拒否する | Pass | `happy-path.unauthorizedRejected=1`、`bridge:smoke` |
| Bridge 再起動後の既存実機復帰 | Pass | `LanHostBridge.checkToken()` は `paired-*` token を保持した実機 poll を再取り込みし、任意文字列や誤tokenは引き続き拒否する |
| device に本文を永続保存しない | Pass | `sample-telemetry.json`、`persistentMessageBodies=false` |
| 個人 pet sprite を release asset に含めない | Pass | sample は `host://` 参照のみ |
| hatch-pet local asset を commit しない | Pass | `firmware/include/pet_asset.local.h` は `.gitignore` 対象。生成ツールと firmware gate だけを commit する |
| Codex App 内部 API に固定依存しない | Pass | Codex relay は clipboard / stdin / file / local session JSONL を source にし、非公開 API scraping を行わない |
| Codex session 自動送信を opt-in にする | Pass | `codex:sessions` はユーザーが明示的に起動する local watcher。release evidence に session 本文を保存しない |
| Codex Hooks 連携で本文を state に残さない | Pass | `codex:hook` は `dist/codex-session-hook-state.json` に本文を含まない署名だけを保存する |
| Dashboard の最新 session 表示を LAN 内運用に限定する | Pass | `/codex/session/latest` は local session 本文を GUI 表示するため、Host Bridge は公開ネットワークへ expose しない |
| Dashboard が秘密情報を永続化しない | Pass | `/debug/snapshot` と `/events` は token、SSID、host IP、回答本文を release evidence として保存しない |
| Display 設定に個人情報を含めない | Pass | `display.settings_updated` は petScale、uiTextScale、bodyTextScale、animationFps、motionStepMs、screen / pet / text / border RGBA、petOffsetX/Y、textBorderEnabled、beepOnAnswer の設定値だけを扱う |
| local pet package path を LAN 外へ公開しない | Pass | `/pet/packages` と `/pet/current/manifest` は local dashboard 用。preview 用の package 名と説明だけを返し、release evidence には個人 sprite や絶対pathを保存しない |
| GUI command 実行をLAN外へ開放しない | Pass | `/debug/commands/run` は localhost からの allowlist command だけを実行し、任意 shell 文字列を受け付けない |
| relay 入力を release asset に含めない | Pass | `codex-relay-manual-check.md` は手順のみ。実会話本文は保存しない |
| 実機 Wi-Fi の安全設定確認 | Partial pass | SSID / password は ignored local header のみ。公開証跡は redacted |

## Release Asset Rules

- `dist/m5stack-codex-pet-notifier-docs.zip` には README、docs、samples、schemas を含める。
- local Wi-Fi config を含めて build した firmware binary は SSID / password / local host IP を含む可能性があるため release asset にしない。
- token、host IP、実会話本文、個人 pet sprite、`firmware/include/pet_asset.local.h`、`dist/codex-session-hook-state.json`、`.env` は含めない。
- clipboard / file watch / session watcher で扱う実 Codex 返答本文は release evidence に本文として保存しない。
- Dashboard の `最近の Codex 回答` 表示は実本文を画面に出すが、docs ZIP、release evidence、hook state には保存しない。
- 実機ログを共有する場合は SSID、IP、token、会話本文を削除する。
