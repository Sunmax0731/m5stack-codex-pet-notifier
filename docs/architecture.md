# アーキテクチャ

```mermaid
flowchart LR
  Codex["Codex Relay (clipboard/stdin/file/session JSONL)"] --> Bridge["LAN Host Bridge"]
  Dashboard["Dashboard GUI"] --> Bridge
  Bridge --> Protocol["Event Protocol / JSON Schemas"]
  Protocol --> Simulator["Mock M5Stack Simulator"]
  Protocol --> Firmware["M5Unified Firmware"]
  Simulator --> Model["Host Bridge Model"]
  Firmware --> Bridge
```

## Responsibility

| Layer | Responsibility | File |
| --- | --- | --- |
| Host adapter | pairing、token 検証、event 配信、device event 受信 | `src/host-adapter/localLanBridge.mjs` |
| LAN Host Bridge | HTTP API、sample replay、event log、WebSocket upgrade | `src/host-bridge/server.mjs` |
| Dashboard GUI | 状態確認、debug snapshot、runtime status、event 送信、Decision 返信確認、最新 Codex session 回答表示、現在 pet preview、Core2 / GRAY preview、表示倍率 / RGBA / beep 調整、環境構築 command modal と allowlist command 実行 | `src/host-bridge/dashboard/` |
| Codex relay | clipboard / stdin / file の返答本文を event 化する | `src/codex-adapter/relay.mjs` |
| Codex session watcher | local session JSONL の最新 user / assistant やり取りを event 化する | `src/codex-adapter/sessionWatcher.mjs` |
| Codex adapter model | Codex 側の未確定差分を隔離する mock | `src/host-adapter/mockCodexAdapter.mjs` |
| Protocol | schema load、型検査、warning | `src/protocol/validator.mjs` |
| Device adapter | Core2 / GRAY の入力と画面差分 | `src/device-adapter/deviceProfiles.mjs` |
| Simulator | device screen state、scroll、reply、interaction | `src/simulator/mockDevice.mjs` |
| Firmware | Wi-Fi、pairing、polling、screen state、button / touch input | `firmware/src/main.cpp` |
| Release guard | QCDS、manual cap、release evidence | `tools/closed-alpha-guard.mjs` |

## Data Flow

1. Codex relay または Dashboard GUI が clipboard / stdin / file / local session JSONL / form input から event を生成する。
2. Host Bridge が device を pairing し token を発行する。
3. Host -> Device event は schema validation 後に queue され、firmware が polling で取得する。
4. Device -> Host event は token 検証後に reply / interaction / heartbeat として受理する。
5. Dashboard は `/events` と `/debug/snapshot` で redacted log を表示し、ABC 返信の `choiceId` と input を確認する。
6. Dashboard は `/codex/session/latest` で local session の最新 assistant 回答を表示し、`/codex/session/publish` で M5Stack へ送信する。
7. Dashboard は `/pet/packages`、`/pet/current/manifest`、`/pet/current/spritesheet.webp` で local hatch-pet キャラを preview し、`/codex/display` で pet 表示倍率、text size、render FPS、motion step、RGBA、answer beep を `display.settings_updated` として送る。
8. Dashboard は `/debug/runtime` で Bridge のforeground / background状態を表示し、`/debug/commands/run` で localhost から allowlist された環境構築 / debug command だけを実行する。
8. Dashboard または `codex:decision` は Codex 側から M5Stack へ三択判断を求め、A/B/C の返信を inbound event として受ける。
9. 通知本文と回答本文は device 永続保存せず、画面状態だけを保持する。

## Reversibility

MQTT、BLE、公開 Codex adapter API は transport / adapter として追加できるように分けています。closed alpha は HTTP polling と Codex relay を既定にし、WebSocket upgrade は将来 transport の検証用に残します。
