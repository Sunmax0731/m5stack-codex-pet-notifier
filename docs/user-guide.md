# ユーザーガイド

## 使い方

1. Host Bridge を PC 上で起動する。
2. M5Stack を同一 Wi-Fi に接続する。
3. M5Stack の Pairing 画面で pairing code を登録する。
4. Idle 画面で pet、接続状態、未読件数を確認する。
5. Codex relay で通知や回答を送り、M5Stack 画面で内容を確認する。
6. Choice 画面では A/B/C に対応する選択肢を押して返信する。

Host Bridge の closed alpha endpoint は LAN 内限定です。公開ネットワークやポート開放した環境では起動しません。

## Core2

- pet 領域を tap すると pet interaction が送られる。
- Answer 画面では swipe または footer touch で本文ページを移動する。
- Answer 画面は日本語本文に対応し、Codex relay から送った日本語の summary / body を表示する。
- Choice 画面では下部 touch button または choice row tap を A/B/C として扱う。

## GRAY

- 物理 A/B/C ボタンで返信する。
- B 長押しまたは IMU tap を pet interaction の代替にする。
- Answer 画面では scroll mode で A/C を上下移動に使う。

## 制約

- closed alpha では実 Codex App 内部 API の代わりに Codex relay、`/codex/event`、`/codex/replay-samples` を使います。
- Core2 の upload、Wi-Fi、pairing、sample event poll は Codex 実行環境で確認対象です。
- GRAY 実機、IMU、長時間運用はユーザー手動確認項目です。
- LAN 外公開は対象外です。
