# ユーザーガイド

## 使い方

1. Host Bridge を PC 上で起動する。
2. M5Stack を同一 Wi-Fi に接続する。
3. M5Stack の Pairing 画面で pairing code を登録する。
4. Idle 画面で pet、接続状態、未読件数を確認する。
5. Codex relay で通知や回答を送り、M5Stack 画面で内容を確認する。
6. `codex:sessions` を起動すると、最近の Codex session の最新やり取りが自動で M5Stack に表示される。
7. Choice 画面では A/B/C に対応する選択肢を押して返信する。
8. PC の Dashboard で event log と inbound reply を確認する。

Host Bridge の closed alpha endpoint は LAN 内限定です。公開ネットワークやポート開放した環境では起動しません。

## Dashboard

Host Bridge 起動後に `http://127.0.0.1:8080/` を開きます。

- 状態確認で paired device、outbound、inbound、security rejection を見る。
- `Answer` tab から Codex の返答本文を M5Stack へ送る。
- `Choice` tab から A/B/C の確認依頼を送り、M5Stack で押された返信を inbound で確認する。
- `Pet` tab から pet name / state / spriteRef を更新し、M5Stack の avatar 表示を確認する。
- `Display` tab から pet display area、UI text size、body text size を `1..8` の8段階で送信し、M5Stack 上の pet 表示面積と文字サイズを調整する。
- `M5Stack 表示プレビュー` で Pet / Answer / Choice / Notify の見え方を送信前に確認する。
- `最近の Codex 回答` panel で local Codex session の最新 assistant 回答を確認し、`M5Stackへ送信` で直前 user message と合わせて Answer 画面へ送る。
- `debug JSON` で redacted snapshot と導入コマンドを確認する。

## Codex Session Auto Relay

最近の Codex session を自動で M5Stack に送る場合は、Host Bridge 起動後に別 PowerShell で次を実行します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:sessions -- --phase any
```

最新の完了応答だけに絞る場合:

```powershell
cmd.exe /d /s /c npm run codex:sessions -- --phase final
```

1回だけ送る場合:

```powershell
cmd.exe /d /s /c npm run codex:sessions -- --once --phase any
```

Codex Hooks から送る場合は、hook の command に次を登録します。

```powershell
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
```

設定例は `docs/codex-hooks.example.json` にあります。

## Pet Asset

`%USERPROFILE%\.codex\pets` の hatch-pet package を使う場合は、firmware build / upload 前に local asset header を生成します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
```

`firmware/include/pet_asset.local.h` は local file です。Git、release asset、docs ZIP には含めません。

## Core2

- pet 領域を tap すると pet interaction が送られる。
- pet surface は hatch-pet asset が生成済みならその素材を表示し、未生成なら fallback avatar を表示する。
- pet surface は state に応じて背景色または表示状態が変わり、frame / bounce animation を行う。fallback avatar では blink / tail も表示する。
- M5Stack の固定ヘッダー文言（`Codex Pet`、`state`、`LAN`、`U:0` など）は表示されない。
- pet display area は Dashboard の `Display` tab から `1..8` を切り替えられる。`8/8` は pet を画面全体に近い最大面積で表示する。
- UI text と body text は Dashboard の `Display` tab から `1..8` を切り替えられる。body text を大きくすると1ページに入る文字量は少なくなる。
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
