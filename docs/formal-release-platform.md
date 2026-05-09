# 正式リリース向けプラットフォーム整備

## MVP Baseline

`v0.1.0-alpha.9` 時点の MVP は、PC の Host Bridge、M5Stack firmware、Dashboard、Codex relay、Codex session watcher、Codex hook relay、hatch-pet asset 連携で構成します。M5Stack は Codex App の内部 API に依存せず、LAN 内の JSON event contract だけを扱います。

## 追加済み Platform Capability

| Capability | 状態 | 根拠 |
| --- | --- | --- |
| Codex decision request | 実装済み | `npm run codex:decision`、`npm run codex:decision:wait`、`/codex/decision`、Dashboard Decision tab |
| Current pet preview | 実装済み | `/pet/current/manifest`、`/pet/current/spritesheet.webp`、Dashboard preview |
| Pet render / motion separation | 実装済み | `animationFps` と `motionStepMs` を分離 |
| Collapsible dashboard sections | 実装済み | `section-toggle` による View / Hide |
| Focus tooltip hints | 実装済み | `data-tooltip` field hints |
| Setup command modal | 実装済み | sidebar の `環境構築コマンド` modal。環境構築 / デバッグ送信 / 保守のtabとlocalhost限定のallowlist command実行を含む |
| Background bridge runtime | 実装済み | `npm run bridge:start:bg`、`/debug/runtime`、sidebar runtime status |

## Release Candidate Workstreams

1. Device reliability
   - Wi-Fi 再接続、Host Bridge 再起動、token 失効時の再pairingを 30 分以上の運用で確認する。
   - GRAY 実機で button / IMU fallback を確認する。

2. Codex workflow
   - `codex:decision:wait` を Codex Hooks または session workflow から呼べる運用例として固定する。
   - A/B/C 返信結果を次の Codex prompt に渡す adapter を追加候補にする。

3. Dashboard productization
   - Preview と実機 layout の差分を継続的に smoke で検出する。
   - tooltip、collapse、command modal、current pet preview を browser smoke の必須チェックにする。

4. Privacy and packaging
   - local pet spritesheet、Wi-Fi 設定、session 本文、token は release asset に含めない。
   - `/pet/current/*` は local Dashboard preview 用であり、public release artifact ではないことを明記する。

## Candidate Additions

| Candidate | 目的 | 優先 |
| --- | --- | --- |
| reply-to-Codex prompt adapter | `codex:decision:wait` の結果を次の Codex prompt へ自動投入する | High |
| device reconnect dashboard | 最終 heartbeat、RSSI、pending event、last poll を GUI で見る | High |
| firmware settings persistence | `petScale`、text size、motion step を再起動後も維持する | Medium |
| OTA update | USB 接続なしで firmware 更新する | Medium |
| MQTT adapter | 複数端末や Home Assistant と接続する | Low |

## Manual Gate

正式リリース候補へ進める前に、`docs/manual-test.md` の Core2 項目、GRAY 項目、長時間運用、Dashboard current pet preview、Codex decision request を実機で確認します。未実施項目がある場合は stable release ではなく prerelease とします。
