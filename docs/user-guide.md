# ユーザーガイド

## 使い方

1. Host Bridge を PC 上で起動する。
2. M5Stack を同一 Wi-Fi に接続する。
3. M5Stack の Pairing 画面で pairing code を登録する。
4. Idle 画面で pet、接続状態、未読件数を確認する。
5. 通知や回答が届いたら M5Stack 画面で内容を確認する。
6. Choice 画面では A/B/C に対応する選択肢を押して返信する。

## Core2

- pet 領域を tap すると pet interaction が送られる。
- Answer 画面では swipe で本文ページを移動する。
- 下部 touch button を A/B/C として扱う。

## GRAY

- 物理 A/B/C ボタンで返信する。
- B 長押しまたは IMU tap を pet interaction の代替にする。
- Answer 画面では scroll mode で A/C を上下移動に使う。

## 制約

- closed alpha では実 Codex App adapter は mock です。
- 実機 Wi-Fi、firmware flash、touch、IMU は Codex では未実施です。
- LAN 外公開は対象外です。
