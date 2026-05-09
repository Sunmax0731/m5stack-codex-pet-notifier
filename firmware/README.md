# Firmware Scaffold

M5Unified を前提にした M5Stack Core2 / GRAY 向け firmware scaffold です。閉鎖アルファでは protocol と device profile の境界を確認するための最小実装に留めます。現在の main では Core2 target を USB serial 自動検出で upload し、2.4GHz Wi-Fi 接続を serial log で確認対象にします。過去証跡では `COM4` で upload 済みです。

## Targets

- `m5stack-core2`: touch / swipe / touch button を使う profile。
- `m5stack-gray`: A/B/C button と IMU tap fallback を使う profile。

## Current Boundary

- Host Bridge とのイベント契約は `schemas/events/*.json` が正です。
- token、host IP、会話本文、個人ペット sprite は firmware repository に固定保存しません。
- `firmware/include/wifi_config.local.h` は `D:\AI\secure\ssid.txt` から生成する local secret file です。Git に入れません。
- Core2 target の build / upload / Wi-Fi 接続は確認済みです。
- touch、button、IMU、GRAY target、実 Codex adapter の確認はユーザー手動検証で実施します。
