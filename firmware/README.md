# Firmware Scaffold

M5Unified を前提にした M5Stack Core2 / GRAY 向け firmware scaffold です。閉鎖アルファでは protocol と device profile の境界を確認するための最小実装に留め、実機ビルドと書き込みは `docs/manual-test.md` の未実施項目として扱います。

## Targets

- `m5stack-core2`: touch / swipe / touch button を使う profile。
- `m5stack-gray`: A/B/C button と IMU tap fallback を使う profile。

## Current Boundary

- Host Bridge とのイベント契約は `schemas/events/*.json` が正です。
- token、host IP、会話本文、個人ペット sprite は firmware repository に固定保存しません。
- PlatformIO / Arduino IDE の実機ビルドはユーザー手動検証で実施します。
