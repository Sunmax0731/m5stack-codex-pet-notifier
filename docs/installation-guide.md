# Installation Guide

## 開発前提

- M5Stack Core2またはM5Stack GRAY。
- Codex Appが動作するWindows PC。
- PCとM5Stackが同一Wi-Fiに接続されていること。
- Arduino IDEまたはPlatformIO。
- Host Bridge実行用のNode.jsまたはPython。

## 初期設定案

1. Host BridgeをPCで起動する。
2. M5Stack firmwareを書き込む。
3. M5StackのPairing画面でhostを発見する。
4. Host Bridgeに表示されたpairing codeを端末へ登録する。
5. Idle画面にpetと接続状態が表示されることを確認する。

## 注意

- 実装開始前の文書であり、現時点では実行コマンドは確定していない。
- 実装後はfirmware書き込み手順、host bridge起動コマンド、トラブルシュートを追記する。
