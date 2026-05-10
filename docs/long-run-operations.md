# 長時間運用設計

## 対象

長時間運用の対象は PC 側 Host Bridge と M5Stack Core2 firmware です。GRAY 実機と GRAY IMU は release target に含めません。

## Host Bridge

- device queue は device ごとに最大 200 件へ制限し、超過時は古い event から破棄して `droppedEvents` に残す。
- outbound / inbound / security log はそれぞれ最大 500 件へ制限し、Dashboard の長時間表示で process memory が増え続けないようにする。
- paired device summary は `lastSeenSec`、`lastPollSec`、`lastHeartbeatSec`、`stale`、`droppedEvents`、最新 heartbeat summary を返す。
- unpaired のまま残った device record は 24 時間超過後に pruning 対象にする。
- session 本文、token、host IP、個人 pet sprite は runtime evidence や release asset に保存しない。

## Core2 Firmware

- HTTP request は `HTTP_TIMEOUT_MS=3500` で timeout し、Host Bridge 不在時に loop が長時間ブロックされないようにする。
- poll 失敗時は `POLL_INTERVAL_MS=1200` から最大 `MAX_POLL_INTERVAL_MS=15000` まで backoff する。
- recoverable poll failure が連続した場合は pairing token を reset し、再 pairing へ戻る。
- Wi-Fi 再接続は `WIFI_RETRY_MIN_MS=5000` から `WIFI_RETRY_MAX_MS=60000` まで exponential backoff し、未接続時に 1 秒固定 delay で loop を塞がない。
- heartbeat には display / pet diagnostics と回復可能 error を含め、Dashboard から実機反映と通信状態を確認できるようにする。

## 運用確認タスク

- `cmd.exe /d /s /c npm test` で queue cap、runtime gate、adapter review を通す。
- 30 分以上の Core2 常時接続で `lastHeartbeatSec` が増え続けず、`stale=false` に戻ることを確認する。
- Host Bridge 再起動後に token rehydrate または再 pairing が発生し、display settings が再送できることを確認する。
- `dist/adapter-review-result.json` と `docs/adapter-review-result.json` に adapter 状態を残す。
