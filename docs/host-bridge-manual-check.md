# Host Bridge 手動確認

この手順は beta prerelease の手動確認準備です。SSID、password、local IP、MAC address、token は公開 docs と release asset に残しません。

## 1. Wi-Fi local config

`D:\AI\secure\ssid.txt` から `firmware/include/wifi_config.local.h` を作成します。M5Stack/ESP32 は 2.4GHz のみ対応するため、5GHz SSID が入っている場合は同じ LAN の 2.4GHz SSID に置き換えます。

確認項目:

- `WIFI_SSID` は 2.4GHz SSID。
- `WIFI_PASSWORD` は secure file 由来。
- `HOST_BRIDGE_HOST` は PC の LAN IP。
- `HOST_BRIDGE_PORT` は `8080`。
- `DEVICE_ID` は `m5stack-sample-001`。

## 2. Host Bridge 起動

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
```

`Port 8080 is already in use` と表示された場合は、firmware upload の失敗ではありません。既存の Host Bridge または別プロセスが 8080 番を使っています。表示された `Existing Bridge version` が現在の version と一致する場合は、そのまま `http://127.0.0.1:8080/` を開いて確認します。version が古い場合や 8080 を閉じられない場合は、repo root の `start-dashboard.bat` をダブルクリックして fallback port を自動選択するか、次を実行します。

```powershell
cmd.exe /d /s /c npm run bridge:start:bg -- --host=127.0.0.1 --port=18081
```

別ターミナルで health を確認します。

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8080/health
```

期待結果:

- `ok` が `true`。
- `version` が `0.2.0-beta.1`。

Dashboard を開きます。

```text
http://127.0.0.1:8080/
```

期待結果:

- topbar に言語、テーマ、更新、debug JSON の操作が表示され、旧ヘッダー文言やBridge行は表示されない。
- paired、outbound、inbound、security の状態が見える。
- `debug JSON` から `/debug/snapshot` を確認できる。
- `/health` の `version` が `0.2.0-beta.1` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が残っているため、その PowerShell を閉じてから再起動する。8080を閉じられない場合は `--port=18081` で最新Bridgeを起動する。

## 3. Firmware upload

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run firmware:upload:core2
```

自動検出が外れた場合:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name
cmd.exe /d /s /c npm run firmware:upload:core2 -- -UploadPort COM3
```

Serial で確認するログ:

- `wifi_connected`
- `pair_ok`
- `wifi_status connected`

## 4. Sample replay

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/codex/replay-samples -ContentType application/json -Body '{"deviceId":"m5stack-sample-001"}'
```

Serial で確認するログ:

- `host_event type=pet.updated`
- `host_event type=display.settings_updated`
- `host_event type=notification.created`
- `host_event type=answer.completed`
- `host_event type=prompt.choice_requested`

M5Stack 画面で確認する状態:

- Idle / Pet updated
- Display settings applied: petScale、text size、animationFps
- Notification
- Answer
- Choice

## 5. Physical input

Choice 画面で A/B/C を押し、Host Bridge event log を確認します。

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8080/events
```

期待結果:

- inbound に `device.reply_selected` が出る。
- Dashboard の `環境構築コマンド` modal にある `Decision 返信` に choiceId / requestEventId / input が出る。
- pet tap または B 長押し後、inbound に `device.pet_interacted` が出る。
- 10 秒程度待つと inbound に `device.heartbeat` が出る。Display settings 送信後は details の `display.applyCount`、`display.lastEventId`、`display.petScale`、`display.petOffsetX/Y`、`display.*Rgba` で実機に適用された値を確認できる。`screen=Error` の場合は `lastError` と `errorRecoverable` を確認し、回復可能な poll 失敗は次の正常 poll で `Idle` へ戻る。

## 今回対象外

GRAY 実機と GRAY IMU は release target 外です。Core2 8時間 soak と実 Codex App Server 接続は確認済みです。Wi-Fi AP停止 / 復帰は今回の soak に含めません。実署名 MSI / MSIX は release 環境での formal gate として残します。複数 M5Stack 同時接続は今後のアップデート対象です。
