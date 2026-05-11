# Strict Manual Test Addendum

## Codex側の実施範囲

- `cmd.exe /d /s /c npm test`
- JSON schema validation
- Host Bridge token boundary
- Mock M5Stack simulator
- LAN Host Bridge smoke
- Codex relay smoke
- Codex app-server adapter smoke
- Codex app-server runtime probe
- Adapter review
- sample telemetry validation
- Core2 PlatformIO build
- Signing readiness check
- Signed installer pipeline preparation
- Core2 firmware upload、2.4GHz Wi-Fi、pairing、sample event poll、A button reply
- Core2 8時間 soak。Wi-Fi AP停止 / 復帰は今回対象外
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

- Wi-Fi AP停止 / 復帰の実運用証跡。
- 実署名付き MSI / MSIX。

## 対象外

- GRAY 実機。
- GRAY IMU。
- 複数 M5Stack 同時接続。今後のアップデート対象。

## Release判定

beta prerelease としては許容します。stable release や `S+` 評価には、実署名付き MSI / MSIX の証跡が必要です。Wi-Fi AP停止 / 復帰は今回対象外で、実施指示がある回だけ別 gate として扱います。
