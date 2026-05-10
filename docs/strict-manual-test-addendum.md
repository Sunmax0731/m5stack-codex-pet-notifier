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

## ユーザー手動確認済み

- Core2 touch / swipe / button 操作。
- Core2 日本語表示。
- Dashboard からの Answer / Decision / Pet / Display 設定送信。
- Codex session auto relay / hook relay / 最新 Codex 回答送信。
- hatch-pet row illustration、pet scale / offset、RGBA、文字背景 alpha、text border。
- Sprite buffer によるちらつき抑制。
- `start-dashboard.bat` と installer shortcut の起動導線。

## Codexでは未実施

- GRAY 実機への firmware 書き込み。
- 長時間 Wi-Fi 再接続。
- GRAY button / IMU の物理操作。
- 署名付き MSI / MSIX。
- 実 Codex App 公開 API 連携。

## Release判定

beta prerelease としては許容します。stable release や `S+` 評価には、上記の未実施項目を実機証跡で埋める必要があります。
