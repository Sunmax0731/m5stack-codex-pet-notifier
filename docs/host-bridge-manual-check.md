# Host Bridge 手動確認

この手順は closed alpha の手動確認準備です。SSID、password、local IP、MAC address、token は公開 docs と release asset に残しません。

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

別ターミナルで health を確認します。

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8080/health
```

期待結果:

- `ok` が `true`。
- `version` が `0.1.0-alpha.7`。

Dashboard を開きます。

```text
http://127.0.0.1:8080/
```

期待結果:

- `M5Stack Codex Pet Console` が表示される。
- paired、outbound、inbound、security の状態が見える。
- `debug JSON` から `/debug/snapshot` を確認できる。
- `/health` の `version` が `0.1.0-alpha.7` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が残っているため、その PowerShell を閉じてから再起動する。

## 3. Firmware upload

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2 -t upload --upload-port COM4
```

repo root から実行する場合:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2 -t upload --upload-port COM4
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
- Dashboard の ABC 返信ワークフロー panel に choiceId / requestEventId / input が出る。
- pet tap または B 長押し後、inbound に `device.pet_interacted` が出る。
- 10 秒程度待つと inbound に `device.heartbeat` が出る。

## 今回対象外

GRAY 実機、GRAY IMU、長時間運用、実 Codex App 内部 API 連携の手動テストはCodexでは未実施です。結果は `docs/manual-test.md` の該当行へ追記します。
