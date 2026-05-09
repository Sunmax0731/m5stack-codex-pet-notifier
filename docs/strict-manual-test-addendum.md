# Strict Manual Test Addendum

## Codex側の実施範囲

- `cmd.exe /d /s /c npm test`
- JSON schema validation
- Host Bridge token boundary
- Mock M5Stack simulator
- LAN Host Bridge smoke
- Codex relay smoke
- sample telemetry validation
- Core2 / GRAY PlatformIO build
- Core2 firmware upload、2.4GHz Wi-Fi、pairing、sample event poll、A button reply
- docs ZIP generation
- QCDS grade validation

## Codexでは未実施

- GRAY 実機への firmware 書き込み。
- 長時間 Wi-Fi 再接続。
- Core2 touch / swipe の物理操作。
- GRAY button / IMU の物理操作。
- 実 Codex App 内部 API 連携。

## Release判定

closed alpha prerelease としては許容します。stable release や `S+` 評価には、上記の未実施項目を実機証跡で埋める必要があります。
