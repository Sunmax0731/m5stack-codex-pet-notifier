# ユーザーガイド

## 使い方

1. Host Bridge を PC 上で起動する。
2. M5Stack を同一 Wi-Fi に接続する。
3. M5Stack の Pairing 画面で pairing code を登録する。
4. Idle 画面で pet surface を確認する。
5. Codex relay で通知や回答を送り、M5Stack 画面で内容を確認する。
6. `codex:sessions` を起動すると、最近の Codex session の最新やり取りが自動で M5Stack に表示される。
7. Choice 画面では A/B/C に対応する選択肢を押して返信する。
8. PC の Dashboard で event log と inbound reply を確認する。

Host Bridge の closed alpha endpoint は LAN 内限定です。公開ネットワークやポート開放した環境では起動しません。

## Dashboard

Host Bridge 起動後に `http://127.0.0.1:8080/` を開きます。Windows では `start-dashboard.bat` をダブルクリックすると background Bridge 起動と Dashboard 表示をまとめて実行できます。

- 状態確認で paired device、outbound、inbound、security rejection を見る。
- `環境構築コマンド` modal の `デバッグ送信` tab から Codex の返答本文や通知を M5Stack へ送る。
- `環境構築コマンド` modal の `デバッグ送信` tab から A/B/C の確認依頼を送り、M5Stack で押された返信を inbound と modal の `Decision 返信` で確認する。
- `M5Stack 表示プレビュー` で現在の hatch-pet キャラ、pet name / state / spriteRef、Pet / Answer / Decision / Notify の見え方を送信前に確認する。プレビューは1ペインで全幅表示され、最近の Codex 回答とイベントログは左右ペインで並びます。
- `?` icon を click すると項目説明が開きます。topbar の `テーマ` は既定でOSに追従し、`言語` は既定日本語から English へ切り替えできます。
- `M5Stack 表示プレビュー` から pet display area、UI text size、body text size を `1..8`、render FPS を `4..20`、motion step を `120..800ms` で送信し、M5Stack 上の pet 表示面積、文字サイズ、描画更新上限、キャラ frame 切替頻度を調整する。
- `M5Stack 表示プレビュー` の `device` で Core2 / GRAY を切り替え、同じ 320x240 画面で入力前提と footer label の違いを確認する。
- `M5Stack 表示プレビュー` の `local hatch-pet asset` または `asset path override` で `%USERPROFILE%\.codex\pets` 配下の任意 package を preview する。
- screen background、pet background、text color、text background、text border の color / alpha と pet X/Y offset を調整し、`表示設定を送信` で M5Stack へ反映する。`テキスト枠を表示` を有効にすると本文パネルと footer に枠線が出ます。`Codex回答のビープ通知` を有効にすると次回 `answer.completed` 到着時に短い beep が鳴る。
- 主要項目に focus して tooltip hint を確認し、各 section の `Hide` / `View` で必要な領域だけ表示する。
- sidebar の `環境構築コマンド` からタブ付き command modal を開き、bridge background 起動 / 再起動、pet asset 生成、Core2 upload、Codex relay、display settings、sample replay を任意パラメータで実行する。Dashboard の `実機反映` では表示設定の送信eventIdと実機heartbeatの `lastEventId` / display値を比較し、`未送信`、`反映待ち`、`反映済み`、`差分あり` を表示します。コマンド実行APIは localhost からの allowlist 実行だけを許可します。
- sidebar の runtime status で Bridge の起動状態、foreground / background、pid、uptime を確認する。
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
Dashboard preview だけを切り替える場合は、Host Bridge 起動後に `local hatch-pet asset` の選択または `asset path override` を使います。firmware へ反映する場合は上記の `pet:asset` 生成後に Core2 build / upload を実行します。

## Core2

- pet 領域を tap すると pet interaction が送られる。
- pet surface は hatch-pet asset が生成済みならその素材を表示し、未生成なら fallback avatar を表示する。Core2 では display area `1..8` ごとの高解像度 frame を選び、拡大時のブロック感を抑える。local hatch-pet asset の透明ピクセルは固定アクセント背景ではなく、pet background RGBA の合成色を見せます。
- pet surface は state に応じて背景色または表示状態が変わり、frame / bounce animation を行う。fallback avatar では blink / tail も表示する。
- pet avatar は `M5Canvas` Sprite buffer へ off-screen 描画してから pet box だけを転送するため、animation tick 中に画面全体の黒塗りや Answer / Choice の本文、footer text の明滅を抑える。
- M5Stack の固定ヘッダー文言（`Codex Pet`、`state`、`LAN`、`U:0` など）は表示されない。
- pet display area は Dashboard の `M5Stack 表示プレビュー` から `1..8` を切り替えられる。`8/8` は pet を画面全体に近い最大面積で表示する。
- render FPS は Dashboard の `M5Stack 表示プレビュー` から `4..20` を切り替えられる。既定は `12fps` で、描画更新の上限として扱う。
- motion step は Dashboard の `M5Stack 表示プレビュー` から `120..800ms` を切り替えられる。既定は `280ms` で、キャラ frame / bounce の切替頻度として扱うため、高FPS時の小刻みな震えを抑える。
- `20fps` でちらつきが目立つ場合は、Core2 に pet box only Sprite 対応 firmware が upload されているか、Host Bridge から display settings が届いているかを確認する。
- UI text と body text は Dashboard の `M5Stack 表示プレビュー` から `1..8` を切り替えられる。body text を大きくすると1ページに入る文字量は少なくなる。
- 画面全体の背景、pet 背景、文字色、文字背景、文字枠は RGBA 設定を受け取り、LCD では最終RGB565色として合成表示する。透明度は Dashboard preview と完全一致ではなく近似です。
- pet X/Y offset は画面外にはみ出す値も許容するため、構図調整で pet の一部だけを見せることができます。
- `beepOnAnswer` が有効な場合、Codex answer 到着時に speaker で短い beep を鳴らす。
- Answer 画面では swipe または footer touch で本文ページを移動する。
- Answer 画面は日本語本文に対応し、Codex relay から送った日本語の summary / body を表示する。
- Choice 画面では下部 touch button または choice row tap を A/B/C として扱う。

## GRAY

- 物理 A/B/C ボタンで返信する。
- B 長押しまたは IMU tap を pet interaction の代替にする。
- Answer 画面では scroll mode で A/C を上下移動に使う。
- GRAY build は `huge_app.csv` partition を使う。local hatch-pet header はFlash余裕を優先して取り込まず、GRAY実機では vector fallback の pet 表示を確認する。

## 制約

- closed alpha では実 Codex App 内部 API の代わりに Codex relay、`/codex/event`、`/codex/replay-samples` を使います。
- Core2 の upload、Wi-Fi、pairing、sample event poll は Codex 実行環境で確認対象です。
- GRAY 実機、IMU、長時間運用はユーザー手動確認項目です。
- LAN 外公開は対象外です。
