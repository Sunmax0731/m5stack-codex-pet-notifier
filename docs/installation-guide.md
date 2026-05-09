# 導入手順

## 必要環境

- Windows + PowerShell
- Node.js 24 以上
- npm 11 以上
- 実機確認時のみ PlatformIO と M5Unified / M5Stack board packages
- 対象 device: M5Stack Core2 / M5Stack GRAY

## 自動検証

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm test
```

期待結果:

- `platform runtime gate passed for m5stack-codex-pet-notifier`
- `dashboard smoke passed`
- `validated m5stack-codex-pet-notifier`
- `closed alpha guard passed for m5stack-codex-pet-notifier`
- `dist/validation-result.json` と `dist/m5stack-codex-pet-notifier-docs.zip` が生成される。

## Demo

```powershell
cmd.exe /d /s /c npm run demo
```

期待結果: `happy-path` の scenario summary が JSON で表示され、`status` が `passed` になる。

## Firmware

closed alpha では動作 firmware を同梱します。Core2 target は接続中のUSB serial portへ upload し、2.4GHz Wi-Fi、Host Bridge pairing、Codex relay answer 表示を確認対象にします。Windows の COM 番号は接続状況で変わるため、通常は `firmware:upload:core2` の自動検出を使います。

Codex Pets の素材を表示する場合は、build / upload の前に hatch-pet package から local asset header を生成します。`firmware/include/pet_asset.local.h` は `.gitignore` 対象で、個人 pet sprite を release asset に含めません。既定では Core2 向けに scale `1..8` ごとの高解像度 frame も生成します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
```

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray
```

PlatformIO を追加導入する場合は `C:\` ではなく `E:\DevEnv` 以下へ配置してください。

この環境では PlatformIO を `E:\DevEnv\PlatformIO\venv` に配置します。
Core2 / GRAY build は同じ `.pio` を使うため、並列ではなく順番に実行します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run firmware:upload:core2
```

upload helper は repo root から実行します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run firmware:upload:core2
```

自動検出が外れた場合は、現在の serial port を確認して明示します。

```powershell
Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name
cmd.exe /d /s /c npm run firmware:upload:core2 -- -UploadPort COM3
```

Wi-Fi 設定は `firmware/include/wifi_config.local.h` を使います。`D:\AI\secure\ssid.txt` が 5GHz SSID を指している場合、M5Stack/ESP32 から見える 2.4GHz SSID に変換して local header に保存してください。

## Host Bridge

PC と M5Stack を同じ LAN に接続し、PC 側で Host Bridge を起動します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080
```

Dashboard:

```text
http://127.0.0.1:8080/
```

Dashboard では health、event log、Answer / Decision / Notification 送信、Decision 返信確認、最近の Codex session 回答表示と M5Stack 送信を GUI から実行できます。状態確認は sidebar に常時表示し、side menu はプレビュー、最近の回答、ログの作業領域を切り替えます。`M5Stack 表示プレビュー` では現在の hatch-pet キャラ、pet 表示面積 `1..32`、text size `1..8`、render FPS `4..20`、motion step `120..800ms` を送信前に確認できます。pet はプレビュー上でドラッグして X/Y 位置を調整し、位置リセットで `0,0` に戻せます。`変更を自動送信` がonの場合は表示パラメータ変更後に自動で実機へ送信され、offの場合は `表示設定を送信` で手動送信します。環境構築と debug command は sidebar の modal から確認し、タブ内のフォームでパラメータを変更して localhost から実行できます。sidebar には Bridge の foreground / background、pid、uptime が表示されます。

Windows では repo root の `start-dashboard.bat` をダブルクリックすると、background Bridge 起動と Dashboard 表示をまとめて実行できます。Dashboard の送信フォームは `環境構築コマンド` modal に統合され、`M5Stack 表示プレビュー` から screen / pet / text / border RGBA、pet X/Y offset、text border 表示を送信できます。Dashboard は既定でOS themeに追従し、label は日本語/Englishを切り替えできます。

別の PowerShell で sample event を送信します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/codex/replay-samples -ContentType application/json -Body '{"deviceId":"m5stack-sample-001"}'
Invoke-RestMethod -Uri http://127.0.0.1:8080/events
```

## Codex Relay

Codex の返答本文を Core2 に表示します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "Codexの返答本文"
cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"
cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
cmd.exe /d /s /c npm run codex:display -- --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12 --motion-step-ms 280 --screen-bg "#050b14ff" --pet-bg "#050b14ff" --text-color "#ffffffff" --text-bg "#000000b2" --pet-offset-x 0 --pet-offset-y 0 --text-border-enabled false --text-border-color "#ffffffff"
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
cmd.exe /d /s /c npm run codex:sessions -- --phase any
cmd.exe /d /s /c npm run codex:sessions -- --once --phase final
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。Core2のAnswer画面で文字化けせずに表示されれば合格です。"
```

Windows で長い日本語本文を送る場合、`cmd.exe` の code page に左右されない clipboard または UTF-8 file watch を優先します。`codex:clipboard` は PowerShell clipboard を Base64 UTF-8 経由で読み取ります。

Codex の最近 session を自動送信する場合は `codex:sessions` を起動します。既定では `%USERPROFILE%\.codex\sessions` の最新 JSONL を監視し、最新の user / assistant のやり取りを `answer.completed` として送ります。進行中の短い更新も見たい場合は `--phase any`、完了応答だけにしたい場合は `--phase final` を使います。

Codex Hooks が使える環境では `docs/codex-hooks.example.json` の command を hook に登録します。`codex:hook` は hook から呼ばれるたびに最新 session を確認し、すでに送った message は本文を保存しない state file で抑止します。
