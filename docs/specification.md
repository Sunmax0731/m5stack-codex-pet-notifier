# 仕様

## コンポーネント

| Component | Responsibility | 実装 |
| --- | --- | --- |
| Host Bridge | Codex App 側の状態を正規イベントへ変換し LAN 内 device へ配信する | `src/host-adapter/localLanBridge.mjs` |
| Device Profile | Core2 / GRAY の入力差分を吸収する | `src/device-adapter/deviceProfiles.mjs` |
| Simulator | 実機なしで通知、回答、選択肢、pet 更新を再生する | `src/simulator/mockDevice.mjs` |
| Protocol | Event schema、validation、warning を管理する | `schemas/events/*.json`、`src/protocol/validator.mjs` |
| Firmware scaffold | M5Unified 前提の最小 device loop | `firmware/` |

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

## 保存方針

- device 保存: `deviceId`、host URL、pairing token、表示設定。
- device 非保存: 通知本文、回答本文、返信本文、個人 pet sprite。
- host 保存: closed alpha では mock log のみ。実 Codex adapter 追加時に保存期間と削除手順を再定義する。
