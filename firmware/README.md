# Firmware Scaffold

M5Unified を前提にした M5Stack Core2 向け firmware scaffold です。現在の release target は Core2 のみです。GRAY 実機と GRAY IMU は対象外とし、Dashboard 側の button reference preview だけを互換確認用に残します。現在の main では Core2 target を USB serial 自動検出で upload し、2.4GHz Wi-Fi 接続を serial log で確認対象にします。過去証跡では `COM4` で upload 済みです。

## Targets

- `m5stack-core2`: touch / swipe / touch button を使う profile。

## Current Boundary

- Host Bridge とのイベント契約は `schemas/events/*.json` が正です。
- token、host IP、会話本文、個人ペット sprite は firmware repository に固定保存しません。
- `firmware/include/wifi_config.local.h` は `D:\AI\secure\ssid.txt` から生成する local secret file です。Git に入れません。
- Core2 target の build / upload / Wi-Fi 接続は確認済みです。
- firmware は HTTP timeout、Wi-Fi reconnect backoff、poll backoff、連続 poll 失敗時の pairing 復帰を持ち、長時間運用で固定 delay loop に固着しないようにします。
- 実 Codex App Server 接続、長時間 soak、署名付き installer はユーザー手動検証で実施します。
