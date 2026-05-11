# 手動テスト

Core2 target の build、upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、Codex relay answer、sample event polling は Codex で確認対象にします。beta では simulator / mock device / LAN Host Bridge smoke / Codex relay smoke / Codex app-server adapter smoke / adapter review / Dashboard smoke / signing readiness の自動検証に加え、USB 接続された M5Stack への firmware 書き込みと LAN 接続ログを証跡化します。GRAY 実機と GRAY IMU は release target 外です。Core2 8時間 soak と実 Codex App Server 接続は formal gate として確認済みです。Wi-Fi AP停止 / 復帰は今回の soak に含めません。実署名 MSI / MSIX は formal release 前の gate です。署名 MSI / MSIX と実 Codex App Server 接続は `docs/manual-test-automation.md` の手順で自動 evidence 化します。

## 共通前提

- Codex App が動作する PC と M5Stack を同一 Wi-Fi へ接続する。
- Host Bridge は LAN 内のみに bind する。
- pairing token を登録し、token なし device event が拒否されることを確認する。
- 個人 pet sprite、host IP、token、会話本文を release asset へ含めない。
- `firmware/include/wifi_config.local.h` は `.gitignore` 対象で、SSID / password / local host IP は commit しない。
- Codex Pets 素材を使う場合は `firmware/include/pet_asset.local.h` を生成してから firmware を build / upload する。この local header は `.gitignore` 対象で commit しない。

## 2026-05-10 手動確認結果

機能ブラッシュアップ時に、ユーザーが Core2 実機、Dashboard、Codex relay、Decision、Display 設定、hatch-pet row illustration、ちらつき抑制、色 / 透明度、位置調整、起動導線を動作確認し、問題なく動作することを確認済みです。以下の Core2 / Dashboard 項目の結果は、このユーザー報告を反映します。GRAY 実機と GRAY IMU は対象外として扱います。Core2 8時間 soak と実 Codex App Server 接続は確認済みで、署名付き MSI / MSIX は beta 残リスクとして別管理します。

## Core2

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| C2-01 | firmware を Core2 target で build / flash する | 起動画面は固定ヘッダーテキストを表示せず、pet surface と状態画面が出る | 実施済み。過去証跡では `COM4` upload 成功、現行手順は USB serial 自動検出 |
| C2-02 | 2.4GHz Wi-Fi へ接続する | serial log に `wifi_connected` と device IP が出る | 実施済み。`wifi_status connected`、local IP は redacted |
| C2-03 | Host Bridge へ pairing する | serial log に `pair_ok` が出る | 実施済み。Host Bridge health で paired device を確認 |
| C2-04 | `notification.created` を送る | 通知画面へ遷移し、serial log に host event が出る | 実施済み。serial で host event を確認 |
| C2-05 | `answer.completed` で長文を送る | Answer 画面へ遷移する | 実施済み。serial で host event を確認 |
| C2-06 | `prompt.choice_requested` を送る | Choice 画面へ遷移する | 実施済み。serial で `screen=Choice` を確認 |
| C2-07 | A/B/C 相当入力を押す | `device.reply_selected` が Host Bridge inbound に出る | 実施済み。A 押下後に `device.reply_selected` を確認 |
| C2-08 | Codex relay で返答本文を送る | Core2 が Answer 画面に遷移し本文を表示する | 実施済み。ユーザー目視で意図どおりの表示を確認 |
| C2-09 | pet 領域を tap する | pet 反応が表示され、`device.pet_interacted` が送られる | 確認済み（ユーザー報告） |
| C2-10 | Answer 画面で swipe または footer touch を行う | 本文ページが上下に移動する | 確認済み（ユーザー報告） |
| C2-11 | Choice 画面で row tap または footer touch を行う | `device.reply_selected` が Host Bridge inbound に出る | 確認済み（ユーザー報告） |
| C2-12 | `codex:answer` で日本語本文を送る | Core2 の Answer 画面で日本語が文字化けせず表示される | 確認済み（ユーザー報告） |
| C2-13 | 日本語本文を clipboard に入れ、`codex:clipboard` を実行する | Core2 の Answer 画面で clipboard 日本語本文が文字化けせず表示される | 実施済み。ユーザー目視で文字化けなし |
| C2-14 | `codex:watch --once` で UTF-8 file 内容を送る | Core2 が `Answer` 画面へ遷移し、summary と file 内容を表示する | 実施済み。ユーザー提供画像で `Answer page 1/1`、summary、file 内容、`A up / B idle / C down` footer を確認 |
| C2-15 | `codex:sessions --once --phase any` を実行する | 最近の Codex session の最新 user / assistant やり取りが Core2 の `Answer` 画面へ自動表示される | 確認済み（ユーザー報告） |
| C2-16 | `codex:hook` を実行する | Codex Hooks から呼ばれる one-shot relay と同じ経路で最新やり取りが Core2 の `Answer` 画面へ表示される | 確認済み（ユーザー報告） |
| C2-17 | Dashboard から `Pet` state を `celebrate` または `reacting` にして送る | Core2 の pet surface が hatch-pet asset として表示され、`celebrate` は jumping row、`reacting` は waving row などのキャラクターイラスト差分に切り替わる。vector fallback だけの表示にならない。pet animation は Sprite buffer で更新され、pet surface 外の本文や footer が毎フレームちらつかない | 確認済み（ユーザー報告） |
| C2-18 | Dashboard から `Choice` を送り、Core2 の A/B/C を押す | Dashboard inbound に `device.reply_selected` と choiceId / input が表示される | 確認済み（ユーザー報告） |
| C2-19 | Dashboard の `最近の Codex 回答` から `M5Stackへ送信` を押す | local Codex session の最新 user / assistant やり取りが Core2 の `Answer` 画面へ表示される | 確認済み（ユーザー報告） |
| C2-20 | Dashboard の `M5Stack 表示プレビュー` で pet display area を `8/32`、`16/32`、`32/32`、UI text size と body text size を任意、render FPS を `12fps`、motion step を `280ms`、pet background / text color / text background を任意の RGBA に変更して送る | Core2 は `Codex Pet`、`state`、`LAN`、`U:0` などの固定ヘッダーテキストを表示せず、pet が画面全体付近から超拡大まで変化する。local hatch-pet asset の透明ピクセルは設定した pet background を見せ、文字背景と文字色もRGBA合成後の色に変わる | 確認済み（ユーザー報告） |
| C2-21 | Dashboard の `M5Stack 表示プレビュー` で Core2 / button reference、Pet / Answer / Decision / Notify を切り替え、pet / display slider、RGBA、local hatch-pet asset を変更する | 送信前の simulated display が現在の hatch-pet キャラ、pet 面積、body text、footer text size、render FPS、motion step、色設定を即時反映する。button reference 切替では IMU なしの button 前提 readout になる | 確認済み（dashboard:smoke + ユーザー報告） |
| C2-22 | `pet:asset` 生成後の firmware で Display slider を `1/32`、`8/32`、`16/32`、`32/32` に変えて pet を見る | Core2 の pet は scale ごとの高解像度 frame に切り替わり、`32/32` では画面外にはみ出す超拡大表示になる | 確認済み（ユーザー報告） |
| C2-23 | Dashboard または `codex:display` で render FPS を `4`、`12`、`20`、motion step を `120`、`280`、`600` の順に送る | render FPS は更新上限、motion step はキャラ frame / bounce の切替頻度として効く。`20fps / 280ms` では小刻みに震えず、Answer / Decision / footer text のちらつきが増えない | 確認済み（ユーザー報告） |
| C2-24 | Answer または Choice 画面を表示したまま pet animation を 20 秒以上見る | pet avatar はアニメーションするが、画面全体の黒塗り、本文の明滅、footer の明滅は発生しない。ちらつきが見える場合は firmware version と pet box only Sprite 対応 build かを確認する | 確認済み（ユーザー報告） |
| C2-25 | `cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"` を実行し、Core2 の A/B/C を押す | Core2 が Decision / Choice 画面へ遷移し、選択後に Host Bridge inbound へ `device.reply_selected` が出る | 確認済み（ユーザー報告） |
| C2-26 | `cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000` を実行し、Core2 の A/B/C を押す | command result に `reply.ok=true` と選択された `choiceId` が返り、Codex 側で次の作業判断に使える | 確認済み（ユーザー報告） |
| C2-27 | Dashboard または `codex:display` で `beepOnAnswer=true` を送信してから `answer.completed` を送る | Core2 が Answer 画面へ遷移し、短い beep 音が鳴る。`beepOnAnswer=false` の場合は鳴らない | 確認済み（ユーザー報告） |
| C2-28 | Dashboard または `codex:display` で `screen background`、`pet background`、`text background` をそれぞれ異なる色にして送る。pet display area は `6/32` 以上、`text background alpha` は `0`、`128`、`255` の順にして Answer または Choice 画面で確認する | LCD 全体の背景、pet 透明ピクセル背面、本文パネル / footer 背景がそれぞれ別設定として見える。alpha `0` では本文パネル / footer の塗りが消え、文字だけが表示される。alpha `128` / `255` では text background が画面背景に同期せず別色で表示される | 確認済み（ユーザー報告） |
| C2-29 | Dashboard または `codex:display` で `pet X/Y offset` を `-80`、`80`、大きな負値 / 正値に変えて送る | pet が上下左右へ移動し、値によって画面外にはみ出して頭や一部だけが見える | 確認済み（ユーザー報告） |
| C2-30 | Dashboard または `codex:display` で `text border` を有効化し、色 / alpha を変える | Answer / Decision / Notification の本文パネルと footer に枠線が出る。無効化すると枠線が消える | 確認済み（ユーザー報告） |
| C2-31 | Dashboard の `表情` を `happy`、`confused`、`alert`、`sleepy` に切り替えて `ペット更新を送信` を押す | local hatch-pet asset では図形 marker ではなく、`happy` は jumping row、`confused` は review row、`alert` / `sleepy` は failed row のキャラクターイラスト差分に切り替わる。fallback pet の場合だけ簡易 marker / 表情差分で近似する。Dashboard outbound の `pet.updated.pet.mood` と一致する | 確認済み（ユーザー報告） |
| C2-32 | Pet 表示領域を single tap / double tap / long press / swipe up / swipe down / swipe left / swipe right する | Host Bridge inbound に `device.pet_interacted` が追加され、`interaction`、`gesture`、`target`、`screen`、`page`、`mood` が Dashboard event log と preview readout に表示される | 確認済み（ユーザー報告） |
| C2-33 | Pet 表示領域を long press し、その後 Core2 の A/B/C を押す | Host Bridge が side effect として `prompt.choice_requested` を queue し、Core2 が Choice 画面へ遷移する。A/B/C 押下後、inbound に `device.reply_selected` が出る | 確認済み（ユーザー報告） |
| C2-34 | `sakenomeuniere` など標準 9 行 atlas の local asset を生成して upload し、Dashboard で `idle`、`thinking`、`listening`、`surprised`、`proud`、`review`、`failed` を順に送る | `idle` は idle、`thinking` は running、`listening` は waiting、`surprised` は waving、`proud` は jumping、`review` は review、`failed` は failed row のイラストに切り替わる。実機と Dashboard preview の row が一致し、local asset 上に追加の図形 marker が重ならない | 確認済み（ユーザー報告） |

## GRAY 今回対象外

今回の手動テスト対象は Core2 です。GRAY firmware build、GRAY 実機 flash / button / IMU は対象外です。Dashboard の `Button reference` は互換 preview であり、実機 target ではありません。

## 長時間運用 / 署名 / 公開 API 手動確認

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| LR-01 | Host Bridge と Core2 を 8 時間以上稼働し、5分ごとに heartbeat と sample event を流す | `/debug/snapshot` または Dashboard で `stale=false`、`lastHeartbeatSec` が更新され、`droppedEvents` が想定外に増えない | 実施済み。`docs/core2-soak-result.json` で 8時間、snapshots 961、heartbeat 961、replay 96回、bridgeFailures 0、stale 0、droppedEvents 0 |
| LR-02 | Wi-Fi AP を一時停止し、復帰後に poll を再開する | firmware が backoff 後に再接続し、連続 poll 失敗時は pairing 復帰できる | 今回対象外。実施タイミングを指定した回だけ別 gate として扱う |
| SIGN-01 | 実署名証明書を用意し、`WINDOWS_SIGNING_CERT_THUMBPRINT` を設定して MSI / MSIX を作成する | `signtool verify` が成功し、証明書や password が repo に残らない | 自動化済み。現環境では WiX / Windows SDK / 署名証明書未導入のため `prepared` |
| API-01 | Codex App Server を起動し、adapter から `initialize`、`thread/start`、`turn/start` を実行する | public interface 経由で thread / turn が作成され、非公開 API scraping を使わない | 実施済み。`docs/codex-app-server-runtime-probe-result.json` で `passed` |

## Dashboard GUI

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| GUI-01 | `npm run bridge:start -- --host=0.0.0.0 --port=8080` 後に `http://127.0.0.1:8080/` を開く | Dashboard が表示され、sidebar 内の状態確認 section に paired / outbound / inbound / security が見える | 確認済み（自動 screenshot + ユーザー報告） |
| GUI-01a | 8080 番が使用中の状態で `npm run bridge:start -- --host=0.0.0.0 --port=8080` を実行する | Node stack trace ではなく、既存 Bridge version と fallback 手順が表示される。同一 version の Bridge が動いている場合は成功扱いで終了する | 確認済み（ユーザー報告） |
| GUI-02 | `debug JSON` を開く | `/debug/snapshot` に health、redacted events、debug commands が出る | `dashboard:smoke` 済み |
| GUI-03 | `環境構築コマンド` modal の `デバッグ送信` tab から `Answer を送信` を実行する | outbound に `answer.completed`、Core2 に Answer 画面が出る | 確認済み（ユーザー報告） |
| GUI-04 | Dashboard の `M5Stack 表示プレビュー` から Pet state `celebrate` を送る | Core2 の pet avatar が state 連動でアニメーションし、Sprite buffer により pet surface 外の文字や footer がちらつかない | 確認済み（ユーザー報告） |
| GUI-05 | `環境構築コマンド` modal の `デバッグ送信` tab から `ABC Decision を送信` を実行し、Core2 で A/B/C を押す | inbound に `device.reply_selected`、modal の `Decision 返信` に choiceId / input が出る | 確認済み（ユーザー報告） |
| GUI-06 | `環境構築コマンド` modal の `sample replay` を押す | sample events が outbound に追加され、Core2 が poll する | 確認済み（ユーザー報告） |
| GUI-07 | `環境構築コマンド` modal で `codexSessions` を確認し、任意パラメータで実行する | 最新 Codex session が `answer.completed` として outbound に出る | 確認済み（ユーザー報告） |
| GUI-08 | `最近の Codex 回答` panel の `読込` を押す | local Codex session の最新 assistant 回答と直前 user message が Dashboard に表示される | 確認済み（dashboard:smoke + ユーザー報告） |
| GUI-09 | `最近の Codex 回答` panel の `M5Stackへ送信` を押す | outbound に `answer.completed` が出て、Core2 の Answer 画面へ同じ内容が表示される | 確認済み（dashboard:smoke + ユーザー報告） |
| GUI-10 | `M5Stack 表示プレビュー` で pet display area を `1..32`、UI text size、body text size を `1..8`、render FPS を `4..20`、motion step を `120..800`、screen / pet / text / border RGBA、pet X/Y offset、beep、反映確認表示を変更する。pet はプレビュー上でドラッグして位置調整し、`位置リセット` で `0,0` に戻す。`変更を自動送信` がonなら1秒程度待ち、offなら `表示設定を送信` を押す | outbound に `display.settings_updated` が出る。payload に `screenBackgroundRgba`、`petBackgroundRgba`、`textColorRgba`、`textBackgroundRgba`、`petOffsetX`、`petOffsetY`、`textBorderEnabled`、`textBorderRgba`、`beepOnAnswer`、`visualProbe` が入る。Dashboard の `実機反映` が `反映待ち` になり、10秒程度待つと inbound の `device.heartbeat` details に `display.applyCount`、`display.lastEventId`、送信した display 値が出て `反映済み` になる。`screen=Error` の場合は `lastError` が表示され、回復可能な poll 失敗は次の正常 poll で `Idle` へ戻る。`visualProbe=true` の場合は Core2 に短時間の反映確認画面が出る。古い bridge process では fallback の `pet.updated` でも可 | 確認済み（dashboard:smoke + ユーザー報告） |
| GUI-11 | side menu で `プレビュー`、`最近の回答`、`ログ` へ移動する | `状態確認` section は sidebar 内に常時表示され、状態 button は表示されない。各 section へ移動できる。独立した `送信` / `デバッグ` menu はなく、Answer / Decision / Notification は `環境構築コマンド` modal 内にある | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-12 | 各 section の `Hide` / `View` を押す | section body が折りたたみ / 再表示される | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-13 | 主要 input / slider 横の `?` icon をクリックする | 項目の意味を説明する help popover が表示され、外側 click または Esc で閉じる | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-14 | sidebar の `環境構築コマンド` を押す | `環境構築`、`デバッグ送信` のタブ付き command modal が開き、Bridge background 起動 / 再起動、pet asset、Core2 upload、Codex Answer / Decision / Notification / Display / session、sample replay を任意パラメータで実行できる。重複していた `保守` tab と直接送信フォームは表示されない | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-15 | `local hatch-pet asset` を別packageへ切り替える、または `asset path override` に `%USERPROFILE%\.codex\pets\Mira` を入れる | preview の `current pet` と simulated display が選択した package の spritesheet に切り替わる | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-16 | `M5Stack 表示プレビュー` の `device` を Core2 / Button reference で切り替える | preview readout が `Core2 / 320x240 / touch` と `Button reference / 320x240 / no IMU` で切り替わる。`M5Stack 表示プレビュー` は1ペイン全幅で表示され、`最近の Codex 回答` と `イベントログ` は左右ペインのまま表示される | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-17 | `cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080` で起動し、Dashboard sidebar を見る | PowerShell 画面を残さずHost Bridgeが動き、sidebarに `Bridge running / background`、pid、uptimeが表示される | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-18 | `start-dashboard.bat` をダブルクリックする | background Bridge が起動し、既定ブラウザで `http://127.0.0.1:8080/` が開く。失敗時は batch window にエラーが表示される | 確認済み（ユーザー報告） |
| GUI-19 | Dashboard preview の Pet 画面で footer を見る | `A poll` が左、`B pet` が中央、`C idle` が右に表示され、実機 footer 位置と一致する | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-20 | topbar の `テーマ` を `OSに追従`、`ライト`、`ダーク` に切り替える | Dashboard 全体が選択 theme に切り替わる。既定は `OSに追従` | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-21 | topbar の `言語` を `日本語` / `English` に切り替える | 項目名、主要ボタン、command modal の代表 label が選択言語に切り替わる。既定は日本語 | `dashboard:smoke` 済み。ユーザー目視 |
| GUI-22 | `環境構築コマンド` modal の `環境構築` tab で `Bridge を再起動` を実行する | 実行結果に `restarting: true` が出る。数秒後にDashboardが再接続し、sidebar runtime status の pid / uptime が更新される | 確認済み（ユーザー報告） |
| GUI-23 | release asset の installer zip を展開し、`installer\M5StackCodexPetNotifier-Setup.bat` をダブルクリックする | Desktop と Start Menu に shortcut が作成され、`%LOCALAPPDATA%\M5StackCodexPetNotifier\install.json` が保存される。`LaunchAfterInstall` により Dashboard が開く | 確認済み（ユーザー報告） |
| GUI-24 | Desktop shortcut または repo root の `start-dashboard.bat` をダブルクリックする | PowerShell 画面を残さず Host Bridge が background 起動し、既定ブラウザで Dashboard が開く。sidebar runtime status が `Bridge running / background` を示す | 確認済み（ユーザー報告） |

## 記録項目

- firmware build hash。
- Host Bridge version。
- Wi-Fi SSID 種別。
- device model。
- 画面写真または短い動画。
- 失敗時の event log。

## 手動確認準備コマンド

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
```

Windows の通常確認では `start-dashboard.bat` をダブルクリックしても同じ Dashboard を開けます。

Dashboard:

```text
http://127.0.0.1:8080/
```

別ターミナル:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/codex/replay-samples -ContentType application/json -Body '{"deviceId":"m5stack-sample-001"}'
Invoke-RestMethod -Uri http://127.0.0.1:8080/events
```

Codex relay:

```powershell
cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "Core2に表示するCodex返答本文"
cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"
cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
cmd.exe /d /s /c npm run codex:display -- --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12 --motion-step-ms 280 --pet-bg "#050b14ff" --text-color "#ffffffff" --text-bg "#000000b2" --beep-on-answer true
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
cmd.exe /d /s /c npm run codex:sessions -- --once --phase any
cmd.exe /d /s /c npm run codex:sessions -- --phase final
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
```

firmware:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
cmd.exe /d /s /c npm run firmware:upload:core2
```

repo root から実行する場合:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
cmd.exe /d /s /c npm run firmware:upload:core2
```

## Codex実施ログ要約

- Build: `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- Upload: `cmd.exe /d /s /c npm run firmware:upload:core2`
- Japanese display source gate: `scripts/validate.mjs` で `fonts::efontJA_12` と UTF-8 code point 境界のページングを確認する。
- Serial evidence: `wifi_connected`、`pair_ok`、Host Bridge sample event を確認対象にする。
- Codex relay evidence: `codex:answer` で `answer.completed` を送信し、Core2 の Answer 表示と `/events` outbound を確認済み。ユーザー目視でも意図どおりの表示を確認した。
- Clipboard Japanese evidence: `codex:clipboard` で日本語本文を送信し、Core2 の Answer 表示が文字化けしていないことをユーザー目視で確認済み。
- File watch evidence: `codex:watch --file dist\codex-answer.txt --once` で `Codex file watch answer` を送信し、Core2 の `Answer page 1/1` に summary、本文、`A up / B idle / C down` footer が表示されたことをユーザー提供画像で確認済み。
- Codex session evidence: `codex:sessions` は `%USERPROFILE%\.codex\sessions` の最新 JSONL から最新 user / assistant やり取りを抽出し、`answer.completed` として送信する。自動検証は `scripts/codex-session-smoke.mjs` で実施する。
- Codex hook evidence: `codex:hook` は Codex Hooks の command hook から呼べる one-shot relay で、本文を含まない state file により重複送信を抑止する。
- Codex App Server evidence: `codex:app-server:smoke` は public JSON-RPC adapter の message builder と transport gate を確認する。`codex:app-server:probe -- --include-turn` は実 `codex app-server` で `initialize`、`thread/start`、`turn/start` を確認し、本文を保存しない JSON evidence を出力する。
- Signing evidence: `installer:signing:check` は Windows SDK / WiX / 署名用 env の準備状況を `dist/windows-signing-readiness.json` に出力する。`installer:signed:pipeline` は WiX source / MSIX payload、環境がそろっている場合は package 作成、署名、verify まで進める。
- Long-run evidence: Host Bridge は queue/log 上限、stale diagnostics、heartbeat age、dropped event count を出し、firmware は Wi-Fi / poll backoff を持つ。8時間以上の soak は `LR-01` の手動確認対象。
- Dashboard evidence: `dashboard:smoke`、desktop / mobile browser screenshot、Core2 firmware upload を実施済み。GUI と実機連携の最終目視は `docs/gui-tools-manual-check.md` に従って実施する。
- Hatch-pet asset evidence: `%USERPROFILE%\.codex\pets\Mira` から scale-specific frame 付きの `firmware/include/pet_asset.local.h` を生成し、Core2 firmware に組み込む。生成済み header は ignored local file として扱う。
- PC-side LAN reachability: M5Stack の local IP へ `Test-Connection` が成功。
- 注意: `D:\AI\secure\ssid.txt` の SSID は 5GHz 側だったため、M5Stack から見える 2.4GHz 側 SSID を local config に設定した。
