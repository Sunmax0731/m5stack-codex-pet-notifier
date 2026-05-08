# 仕様

## コンポーネント

| Component | Responsibility |
| --- | --- |
| Host Bridge | Codex App側の状態を正規イベントへ変換し、LAN内deviceへ配信する |
| Device Firmware | M5Stack上で表示、入力、返信、再接続を扱う |
| Device Profile | Core2 / GRAYの入力差分、画面更新、fallback操作を吸収する |
| Simulator | 実機なしで通知、回答、選択肢、pet更新を再生する |
| Sample Payloads | 実装とテストで使う代表JSON |

## Transport

- MVPはWebSocketを第一候補にする。
- pairingと初期設定はHTTPで行う。
- mDNS discoveryを試み、失敗時はhost IP手動入力へfallbackする。
- 将来のMQTT adapterはtransport差し替えで追加する。

## Event Schema

| Event | Direction | Required Fields |
| --- | --- | --- |
| `pet.updated` | Host -> Device | `eventId`, `pet.id`, `pet.name`, `pet.state`, `pet.spriteRef` |
| `notification.created` | Host -> Device | `eventId`, `title`, `body`, `severity`, `createdAt` |
| `answer.completed` | Host -> Device | `eventId`, `threadId`, `summary`, `body`, `createdAt` |
| `prompt.choice_requested` | Host -> Device | `eventId`, `threadId`, `prompt`, `choices[]`, `timeoutSec` |
| `device.reply_selected` | Device -> Host | `eventId`, `requestEventId`, `choiceId`, `deviceId` |
| `device.pet_interacted` | Device -> Host | `eventId`, `petId`, `interaction`, `deviceId` |

## 画面状態

| State | Trigger | 表示 |
| --- | --- | --- |
| Pairing | 初回起動、token失効 | host IP、pairing code、接続状態 |
| Idle | 通常時 | pet、接続状態、未読件数、最終通知 |
| Notification | `notification.created` | タイトル、本文、重要度 |
| Answer | `answer.completed` | 要約、本文、スクロール位置 |
| Choice | `prompt.choice_requested` | prompt、A/B/C選択肢、timeout |
| Error | 通信断、認証失敗、payload不正 | 原因、再試行状態 |

## 入力割り当て

| Operation | Core2 | GRAY |
| --- | --- | --- |
| 選択A/B/C | 下部touch buttonまたは画面領域 | 物理A/B/C |
| ペット反応 | pet領域tap | B長押しまたはIMU tap |
| 回答スクロール | swipe up/down | A/C上下、B決定 |
| 戻る | 画面左上tapまたはB長押し | B長押し |

## 保存

- device保存: `deviceId`、host URL、pairing token、表示設定。
- device非保存: 通知本文、回答本文、返信本文、個人ペット画像。
- host保存: 開発中のみevent logを保存し、release前に保存設定を明示する。
