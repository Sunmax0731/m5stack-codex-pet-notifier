# 手動テスト

手動テストはCodexでは未実施です。closed alpha では simulator / mock device の自動検証までを Codex 側の実施範囲とし、Core2 / GRAY 実機確認はユーザー側の手動項目として残します。

## 共通前提

- Codex App が動作する PC と M5Stack を同一 Wi-Fi へ接続する。
- Host Bridge は LAN 内のみに bind する。
- pairing token を登録し、token なし device event が拒否されることを確認する。
- 個人 pet sprite、host IP、token、会話本文を release asset へ含めない。

## Core2

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| C2-01 | firmware を Core2 target で build / flash する | 起動画面に `Codex Pet` と profile が出る | 未実施 |
| C2-02 | pairing code で登録する | Idle 画面に pet と接続状態が出る | 未実施 |
| C2-03 | `notification.created` を送る | 通知画面へ遷移する | 未実施 |
| C2-04 | `answer.completed` で長文を送る | swipe でスクロールできる | 未実施 |
| C2-05 | `prompt.choice_requested` を送る | A/B/C 相当入力で返信できる | 未実施 |
| C2-06 | pet 領域を tap する | pet 反応が表示され、interaction event が送られる | 未実施 |

## GRAY

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| GY-01 | firmware を GRAY target で build / flash する | 起動画面に `Codex Pet` と profile が出る | 未実施 |
| GY-02 | pairing code で登録する | Idle 画面に pet と接続状態が出る | 未実施 |
| GY-03 | `notification.created` を送る | 通知画面へ遷移する | 未実施 |
| GY-04 | `answer.completed` で長文を送る | A/C または scroll mode で上下移動できる | 未実施 |
| GY-05 | `prompt.choice_requested` を送る | 物理 A/B/C で返信できる | 未実施 |
| GY-06 | B 長押しまたは IMU tap を行う | pet 反応が表示される | 未実施 |

## 記録項目

- firmware build hash。
- Host Bridge version。
- Wi-Fi SSID 種別。
- device model。
- 画面写真または短い動画。
- 失敗時の event log。
