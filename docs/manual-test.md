# 手動テスト

Core2 target の build、upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、Codex relay answer、sample event polling は Codex で確認対象にします。closed alpha では simulator / mock device / LAN Host Bridge smoke / Codex relay smoke の自動検証に加え、USB 接続された M5Stack への firmware 書き込みと LAN 接続ログを証跡化します。GRAY 実機、GRAY IMU、長時間運用、Codex App 非公開内部 API 連携は今回対象外です。

## 共通前提

- Codex App が動作する PC と M5Stack を同一 Wi-Fi へ接続する。
- Host Bridge は LAN 内のみに bind する。
- pairing token を登録し、token なし device event が拒否されることを確認する。
- 個人 pet sprite、host IP、token、会話本文を release asset へ含めない。
- `firmware/include/wifi_config.local.h` は `.gitignore` 対象で、SSID / password / local host IP は commit しない。
- Codex Pets 素材を使う場合は `firmware/include/pet_asset.local.h` を生成してから firmware を build / upload する。この local header は `.gitignore` 対象で commit しない。

## Core2

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| C2-01 | firmware を Core2 target で build / flash する | 起動画面に `Codex Pet` と profile が出る | 実施済み。`COM4` upload 成功 |
| C2-02 | 2.4GHz Wi-Fi へ接続する | serial log に `wifi_connected` と device IP が出る | 実施済み。`wifi_status connected`、local IP は redacted |
| C2-03 | Host Bridge へ pairing する | serial log に `pair_ok` が出る | 実施済み。Host Bridge health で paired device を確認 |
| C2-04 | `notification.created` を送る | 通知画面へ遷移し、serial log に host event が出る | 実施済み。serial で host event を確認 |
| C2-05 | `answer.completed` で長文を送る | Answer 画面へ遷移する | 実施済み。serial で host event を確認 |
| C2-06 | `prompt.choice_requested` を送る | Choice 画面へ遷移する | 実施済み。serial で `screen=Choice` を確認 |
| C2-07 | A/B/C 相当入力を押す | `device.reply_selected` が Host Bridge inbound に出る | 実施済み。A 押下後に `device.reply_selected` を確認 |
| C2-08 | Codex relay で返答本文を送る | Core2 が Answer 画面に遷移し本文を表示する | 実施済み。ユーザー目視で意図どおりの表示を確認 |
| C2-09 | pet 領域を tap する | pet 反応が表示され、`device.pet_interacted` が送られる | ユーザー手動 |
| C2-10 | Answer 画面で swipe または footer touch を行う | 本文ページが上下に移動する | ユーザー手動 |
| C2-11 | Choice 画面で row tap または footer touch を行う | `device.reply_selected` が Host Bridge inbound に出る | ユーザー手動 |
| C2-12 | `codex:answer` で日本語本文を送る | Core2 の Answer 画面で日本語が文字化けせず表示される | 準備済み。ユーザー目視 |
| C2-13 | 日本語本文を clipboard に入れ、`codex:clipboard` を実行する | Core2 の Answer 画面で clipboard 日本語本文が文字化けせず表示される | 実施済み。ユーザー目視で文字化けなし |
| C2-14 | `codex:watch --once` で UTF-8 file 内容を送る | Core2 が `Answer` 画面へ遷移し、summary と file 内容を表示する | 実施済み。ユーザー提供画像で `Answer page 1/1`、summary、file 内容、`A up / B idle / C down` footer を確認 |
| C2-15 | `codex:sessions --once --phase any` を実行する | 最近の Codex session の最新 user / assistant やり取りが Core2 の `Answer` 画面へ自動表示される | 準備済み。ユーザー手動 |
| C2-16 | `codex:hook` を実行する | Codex Hooks から呼ばれる one-shot relay と同じ経路で最新やり取りが Core2 の `Answer` 画面へ表示される | 準備済み。ユーザー手動 |
| C2-17 | Dashboard から `Pet` state を `celebrate` または `reacting` にして送る | Core2 header の pet avatar が hatch-pet asset として表示され、色または背景、frame / bounce animation が継続する。vector fallback だけの表示にならない | 準備済み。ユーザー手動 |
| C2-18 | Dashboard から `Choice` を送り、Core2 の A/B/C を押す | Dashboard inbound に `device.reply_selected` と choiceId / input が表示される | 準備済み。ユーザー手動 |
| C2-19 | Dashboard の `最近の Codex 回答` から `M5Stackへ送信` を押す | local Codex session の最新 user / assistant やり取りが Core2 の `Answer` 画面へ表示される | 準備済み。ユーザー手動 |

## GRAY 今回対象外

今回の手動テスト対象は Core2 です。GRAY firmware build は自動確認しますが、GRAY 実機 flash / button / IMU は今回対象外です。

## Dashboard GUI

| No | 手順 | 期待結果 | 結果 |
| --- | --- | --- | --- |
| GUI-01 | `npm run bridge:start -- --host=0.0.0.0 --port=8080` 後に `http://127.0.0.1:8080/` を開く | Dashboard が表示され、paired / outbound / inbound / security が見える | 自動 screenshot 済み。実機連携はユーザー手動 |
| GUI-02 | `debug JSON` を開く | `/debug/snapshot` に health、redacted events、debug commands が出る | `dashboard:smoke` 済み |
| GUI-03 | Dashboard の Answer tab から本文を送る | outbound に `answer.completed`、Core2 に Answer 画面が出る | ユーザー手動 |
| GUI-04 | Dashboard の Pet tab から `celebrate` を送る | Core2 の pet avatar が state 連動でアニメーションする | ユーザー手動 |
| GUI-05 | Dashboard の Choice tab から A/B/C を送り、Core2 で A/B/C を押す | inbound に `device.reply_selected`、workflow panel に choiceId / input が出る | ユーザー手動 |
| GUI-06 | `sample replay` を押す | sample events が outbound に追加され、Core2 が poll する | ユーザー手動 |
| GUI-07 | Dashboard の command panel で `codexSessions` を確認し、別 PowerShell で実行する | 最新 Codex session が `answer.completed` として outbound に出る | ユーザー手動 |
| GUI-08 | `最近の Codex 回答` panel の `読込` を押す | local Codex session の最新 assistant 回答と直前 user message が Dashboard に表示される | `dashboard:smoke` 済み。実 session 目視はユーザー手動 |
| GUI-09 | `最近の Codex 回答` panel の `M5Stackへ送信` を押す | outbound に `answer.completed` が出て、Core2 の Answer 画面へ同じ内容が表示される | `dashboard:smoke` 済み。実機目視はユーザー手動 |

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
cmd.exe /d /s /c npm run codex:choice -- --prompt "次の作業を選んでください" --choices yes:進める,no:止める,other:別案
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
cmd.exe /d /s /c npm run codex:sessions -- --once --phase any
cmd.exe /d /s /c npm run codex:sessions -- --phase final
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
```

firmware:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4
```

repo root から実行する場合:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2 -t upload --upload-port COM4
```

## Codex実施ログ要約

- Build: `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- Upload: `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4`
- Japanese display source gate: `scripts/validate.mjs` で `fonts::efontJA_12` と UTF-8 code point 境界のページングを確認する。
- Serial evidence: `wifi_connected`、`pair_ok`、Host Bridge sample event を確認対象にする。
- Codex relay evidence: `codex:answer` で `answer.completed` を送信し、Core2 の Answer 表示と `/events` outbound を確認済み。ユーザー目視でも意図どおりの表示を確認した。
- Clipboard Japanese evidence: `codex:clipboard` で日本語本文を送信し、Core2 の Answer 表示が文字化けしていないことをユーザー目視で確認済み。
- File watch evidence: `codex:watch --file dist\codex-answer.txt --once` で `Codex file watch answer` を送信し、Core2 の `Answer page 1/1` に summary、本文、`A up / B idle / C down` footer が表示されたことをユーザー提供画像で確認済み。
- Codex session evidence: `codex:sessions` は `%USERPROFILE%\.codex\sessions` の最新 JSONL から最新 user / assistant やり取りを抽出し、`answer.completed` として送信する。自動検証は `scripts/codex-session-smoke.mjs` で実施する。
- Codex hook evidence: `codex:hook` は Codex Hooks の command hook から呼べる one-shot relay で、本文を含まない state file により重複送信を抑止する。
- Dashboard evidence: `dashboard:smoke`、desktop / mobile browser screenshot、Core2 firmware upload を実施済み。GUI と実機連携の最終目視は `docs/gui-tools-manual-check.md` に従って実施する。
- Hatch-pet asset evidence: `%USERPROFILE%\.codex\pets\Mira` から `firmware/include/pet_asset.local.h` を生成し、Core2 firmware に組み込む。生成済み header は ignored local file として扱う。
- PC-side LAN reachability: M5Stack の local IP へ `Test-Connection` が成功。
- 注意: `D:\AI\secure\ssid.txt` の SSID は 5GHz 側だったため、M5Stack から見える 2.4GHz 側 SSID を local config に設定した。
