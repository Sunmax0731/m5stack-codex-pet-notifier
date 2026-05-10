# TODO

## v0.1.0-alpha.1

- [x] Source idea pack を formal repo に反映する。
- [x] Host Bridge mock と event schema を実装する。
- [x] Core2 device profile と button reference simulator を実装する。
- [x] representative suite と platform runtime gate を用意する。
- [x] QCDS、security/privacy、traceability、release docs を整備する。
- [x] Core2 実機で firmware build / flash / touch / Wi-Fi を確認する。
- [x] GRAY 実機と GRAY IMU を release target 外として docs / firmware / schema から外す。

## Post Alpha

- [x] 長時間運用向けに Host Bridge queue/log 上限、stale diagnostics、firmware Wi-Fi / poll backoff を追加する。
- [x] 署名付き MSI / MSIX のテンプレートと signing readiness check を追加する。
- [x] 実 Codex App 公開 API 連携に向け、Codex app-server adapter smoke と adapter review を追加する。
- [ ] 実 Codex App Server へ接続し、thread/start と turn/start の end-to-end を手動確認する。
- [ ] 実署名証明書で MSI / MSIX を作成し、Windows SmartScreen / installer 起動を確認する。
- [ ] 長時間 soak test を Core2 実機で実施し、heartbeat / dropped event / reconnect evidence を保存する。
- [ ] PlatformIO CI または手動 build 証跡を追加する。
- MQTT adapter と Home Assistant 連携を検討する。
