# 手動テスト

Core2 target の build、upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、Codex relay answer、sample event polling は Codex で確認対象にします。closed alpha では simulator / mock device / LAN Host Bridge smoke / Codex relay smoke の自動検証に加え、USB 接続された M5Stack への firmware 書き込みと LAN 接続ログを証跡化します。GRAY 実機、GRAY IMU、長時間運用、Codex App 非公開内部 API 連携は今回対象外です。

## 共通前提

- Codex App が動作する PC と M5Stack を同一 Wi-Fi へ接続する。
- Host Bridge は LAN 内のみに bind する。
- pairing token を登録し、token なし device event が拒否されることを確認する。
- 個人 pet sprite、host IP、token、会話本文を release asset へ含めない。
- `firmware/include/wifi_config.local.h` は `.gitignore` 対象で、SSID / password / local host IP は commit しない。

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

## GRAY 今回対象外

今回の手動テスト対象は Core2 です。GRAY firmware build は自動確認しますが、GRAY 実機 flash / button / IMU は今回対象外です。

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

別ターミナル:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/codex/replay-samples -ContentType application/json -Body '{"deviceId":"m5stack-sample-001"}'
Invoke-RestMethod -Uri http://127.0.0.1:8080/events
```

Codex relay:

```powershell
cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "Core2に表示するCodex返答本文"
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
```

firmware:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4
```

repo root から実行する場合:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2 -t upload --upload-port COM4
```

## Codex実施ログ要約

- Build: `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2`
- Upload: `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4`
- Japanese display source gate: `scripts/validate.mjs` で `fonts::efontJA_12` と UTF-8 code point 境界のページングを確認する。
- Serial evidence: `wifi_connected`、`pair_ok`、Host Bridge sample event を確認対象にする。
- Codex relay evidence: `codex:answer` で `answer.completed` を送信し、Core2 の Answer 表示と `/events` outbound を確認済み。ユーザー目視でも意図どおりの表示を確認した。
- Clipboard Japanese evidence: `codex:clipboard` で日本語本文を送信し、Core2 の Answer 表示が文字化けしていないことをユーザー目視で確認済み。
- PC-side LAN reachability: M5Stack の local IP へ `Test-Connection` が成功。
- 注意: `D:\AI\secure\ssid.txt` の SSID は 5GHz 側だったため、M5Stack から見える 2.4GHz 側 SSID を local config に設定した。
