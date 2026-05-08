# 手動テスト

## 前提

- 手動テストは未実施。
- 実施時はCodex Appが動作するPCとM5Stackを同一Wi-Fiへ接続する。
- Host BridgeはLAN内のみにbindする。

## Core2

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| C2-01 | pairing codeで登録する | Idle画面にpetと接続状態が出る | 未実施 |
| C2-02 | `notification.created`を送る | 通知画面へ遷移する | 未実施 |
| C2-03 | `answer.completed`で長文を送る | スワイプでスクロールできる | 未実施 |
| C2-04 | `prompt.choice_requested`を送る | A/B/C相当入力で返信できる | 未実施 |
| C2-05 | pet領域をタップする | pet反応が表示され、interaction eventが送られる | 未実施 |

## GRAY

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| GY-01 | pairing codeで登録する | Idle画面にpetと接続状態が出る | 未実施 |
| GY-02 | `notification.created`を送る | 通知画面へ遷移する | 未実施 |
| GY-03 | `answer.completed`で長文を送る | A/Cまたはscroll modeで上下移動できる | 未実施 |
| GY-04 | `prompt.choice_requested`を送る | 物理A/B/Cで返信できる | 未実施 |
| GY-05 | B長押しまたはIMU tapを行う | pet反応が表示される | 未実施 |

## 記録項目

- firmware build hash。
- Host Bridge version。
- Wi-Fi SSID種別。
- device model。
- 画面写真または短い動画。
- 失敗時のevent log。
