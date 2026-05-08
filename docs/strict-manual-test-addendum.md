# Strict Manual Test Addendum

## Codex側の実施範囲

- `cmd.exe /d /s /c npm test`
- JSON schema validation
- Host Bridge token boundary
- Mock M5Stack simulator
- sample telemetry validation
- docs ZIP generation
- QCDS grade validation

## Codexでは未実施

- Core2 実機への firmware 書き込み。
- GRAY 実機への firmware 書き込み。
- 実 Wi-Fi 再接続。
- touch / swipe / button / IMU の物理操作。
- 実 Codex App adapter 連携。

## Release判定

closed alpha prerelease としては許容します。stable release や `S+` 評価には、上記の未実施項目を実機証跡で埋める必要があります。
