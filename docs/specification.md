# 仕様

## コンポーネント

| Component | Responsibility | 実装 |
| --- | --- | --- |
| Host Bridge model | Codex App 側の状態を正規イベントへ変換し LAN 内 device へ配信する contract を検証する | `src/host-adapter/localLanBridge.mjs` |
| LAN Host Bridge | pairing、token 認証、HTTP polling、device event 受信、sample replay、event log を提供する | `src/host-bridge/server.mjs` |
| Dashboard GUI | Host Bridge の状態確認、debug snapshot、event 送信、ABC 返信確認、導入コマンド参照を提供する | `src/host-bridge/dashboard/` |
| Codex relay | clipboard / stdin / file の Codex 返答を `answer.completed` へ変換して Host Bridge に送る。PowerShell clipboard は Base64 UTF-8 経由で読む | `src/codex-adapter/relay.mjs` |
| Codex session watcher | `%USERPROFILE%\.codex\sessions` の最新 session JSONL から user / assistant の最新やり取りを抽出し、`answer.completed` として送る | `src/codex-adapter/sessionWatcher.mjs` |
| Codex hook relay | Codex Hooks の command hook から one-shot で session watcher を実行し、重複送信を state file で抑止する | `src/codex-adapter/hookRelay.mjs` |
| Device Profile | Core2 / GRAY の入力差分を吸収する | `src/device-adapter/deviceProfiles.mjs` |
| Simulator | 実機なしで通知、回答、選択肢、pet 更新を再生する | `src/simulator/mockDevice.mjs` |
| Protocol | Event schema、validation、warning を管理する | `schemas/events/*.json`、`src/protocol/validator.mjs` |
| Pet asset generator | hatch-pet package の `spritesheet.webp` を firmware 用 RGB565 local header へ変換する | `tools/generate-pet-firmware-asset.py` |
| Firmware | M5Unified、Wi-Fi、HTTP polling、ArduinoJson、日本語フォント表示による device loop | `firmware/` |

## LAN Host Bridge API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/pair` | `deviceId` と `pairingCode` から device token を発行する |
| `GET` | `/device/poll?deviceId&token` | paired device が Host -> Device event を 1 件取得する |
| `POST` | `/device/event?deviceId&token` | device から reply / interaction / heartbeat を送る |
| `POST` | `/codex/event` | Codex adapter 相当の Host -> Device event を queue する |
| `POST` | `/codex/answer` | 返答本文から `answer.completed` を生成して queue する |
| `POST` | `/codex/notification` | 通知本文から `notification.created` を生成して queue する |
| `POST` | `/codex/choice` | 確認依頼から `prompt.choice_requested` を生成して queue する |
| `POST` | `/codex/pet` | pet name / state / spriteRef から `pet.updated` を生成して queue する |
| `POST` | `/codex/replay-samples` | sample event 一式を queue する |
| `GET` | `/events` | outbound / inbound / security log を redaction 前提で確認する |
| `GET` | `/health` | version、paired device、event count を確認する |
| `GET` | `/debug/snapshot` | Dashboard と手動確認用に health、redacted events、debug command を返す |
| `GET` | `/`、`/dashboard/*` | Host Bridge Dashboard を返す |

## Event Schema

| Event | Direction | Required Fields |
| --- | --- | --- |
| `pet.updated` | Host -> Device | `eventId`, `pet.id`, `pet.name`, `pet.state`, `pet.spriteRef` |
| `notification.created` | Host -> Device | `eventId`, `title`, `body`, `severity`, `createdAt` |
| `answer.completed` | Host -> Device | `eventId`, `threadId`, `summary`, `body`, `createdAt` |
| `prompt.choice_requested` | Host -> Device | `eventId`, `threadId`, `prompt`, `choices[]`, `timeoutSec` |
| `device.reply_selected` | Device -> Host | `eventId`, `requestEventId`, `choiceId`, `deviceId` |
| `device.pet_interacted` | Device -> Host | `eventId`, `petId`, `interaction`, `deviceId` |
| `device.heartbeat` | Device -> Host | `eventId`, `deviceId`, `battery`, `wifiRssi`, `screen` |

## 画面状態

| State | Trigger | 表示 |
| --- | --- | --- |
| Pairing | 初回起動、token 失効 | host IP、pairing code、接続状態 |
| Idle | 通常時、`pet.updated` | pet、接続状態、未読件数、最終通知 |
| Notification | `notification.created` | タイトル、本文、重要度 |
| Answer | `answer.completed` | 要約、本文、ページ位置 |
| Choice | `prompt.choice_requested` | prompt、A/B/C 選択肢、timeout |
| Error | 通信断、認証失敗、payload 不正 | 原因、再試行状態 |

## 入力割り当て

| Operation | Core2 | GRAY |
| --- | --- | --- |
| 選択 A/B/C | 下部 touch button または画面領域 | 物理 A/B/C |
| pet 反応 | pet 領域 tap | B 長押しまたは IMU tap |
| 回答スクロール | swipe up/down | A/C 上下、B 決定 |
| 戻る | 画面左上 tap または B 長押し | B 長押し |

## Codex Relay

| Source | Command | Purpose |
| --- | --- | --- |
| stdin / argument | `npm run codex:answer -- --text "..."` | Codex 返答本文を直接送る |
| clipboard | `npm run codex:clipboard -- --summary "..."` | Codex App から copy した返答を送る |
| file | `npm run codex:watch -- --file dist/codex-answer.txt` | 外部ツールが書いた返答ファイルを監視する |
| session JSONL | `npm run codex:sessions -- --phase any` | 最近の Codex session の最新 user / assistant やり取りを自動送信する |
| Codex Hooks | `npm run codex:hook -- --bridge http://127.0.0.1:8080` | Codex hook 発火時に最新 session を1回だけ送る |

`codex:sessions` は opt-in のローカルファイル監視です。Codex App の非公開 API へ接続せず、ローカル session JSONL だけを読みます。`--phase any` は進行中の commentary も送信し、`--phase final` は完了応答だけを送信します。
`codex:hook` は hook process ごとに起動されるため、`dist/codex-session-hook-state.json` に本文を含まない署名だけを保存して重複送信を防ぎます。

## 日本語表示

- firmware は M5GFX の `fonts::efontJA_12` を使用し、日本語を含む UTF-8 文字列を表示する。
- Answer 本文のページングと折り返しは UTF-8 code point 境界で行い、日本語の途中バイトで `substring` しない。
- 画面幅を超える行はピクセル幅で折り返し、最終行のみ `...` で省略する。
- Windows PowerShell から clipboard を読む場合は、PowerShell 側で UTF-8 bytes を Base64 化し、Node.js 側で復元する。

## Dashboard GUI

- Host Bridge と同一 process で static HTML / CSS / JS を配信する。
- Dashboard は `/health`、`/events`、`/debug/snapshot` を polling し、paired device、outbound、inbound、security rejection を表示する。
- Answer / Choice / Pet / Notification はそれぞれ `/codex/answer`、`/codex/choice`、`/codex/pet`、`/codex/notification` を使う。
- command panel は `codex:sessions` を表示し、Codex 最新 session 自動送信の起動コマンドを確認できる。
- ABC 返信ワークフローでは、Choice 送信後に M5Stack 側の A/B/C 操作で `device.reply_selected` が inbound に入ることを Dashboard 上で確認する。
- `/events` は reply の `choiceId`、`requestEventId`、input、heartbeat summary などの運用確認に必要な最小情報だけを返し、回答本文を永続 evidence に残さない。

## Pet Animation

- firmware は header に pet avatar を描画する。
- `firmware/include/pet_asset.local.h` がある場合、hatch-pet package から生成した RGB565 frame を優先表示する。
- `firmware/include/pet_asset.local.h` がない場合、同じ firmware source は vector fallback avatar を描画する。
- local asset header は `.gitignore` 対象で、個人 pet sprite を release asset や docs ZIP に含めない。
- `pet.updated.pet.state` は `idle`、`waiting`、`running`、`failed`、`review`、`reacting`、`celebrate` を受け付ける。
- avatar は `PET_ANIMATION_INTERVAL_MS` ごとに frame / bounce を更新する。fallback avatar では blink / tail も更新する。
- `review`、`reacting`、`celebrate` は色または表情を変え、pet interaction 時は短時間 `reacting` として表示する。

## 保存方針

- device 保存: `deviceId`、host URL、pairing token、表示設定。
- device 非保存: 通知本文、回答本文、返信本文、個人 pet sprite。
- host 保存: closed alpha では event type、eventId、device event summary のみを release evidence に残す。公開 Codex adapter API を追加する場合は保存期間と削除手順を再定義する。
