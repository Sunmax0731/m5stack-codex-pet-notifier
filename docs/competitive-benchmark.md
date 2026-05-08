# Competitive Benchmark

## 比較対象

| 対象 | 強み | 採用する基準 | 本プロダクトの差分 |
| --- | --- | --- | --- |
| M5Stack UIFlow / Arduino examples | M5Stack の画面、ボタン、センサー実装例が豊富 | device profile と実機手順を明確にする | Codex 通知と pet interaction に特化 |
| Home Assistant + MQTT dashboards | IoT device と通知連携の標準的構成 | transport を将来差し替え可能にする | MVP は broker 不要の Host Bridge にする |
| Slack / GitHub desktop notifications | 通知の即時性が高い | 状態、重要度、返信導線を揃える | PC 画面外の物理端末で確認できる |
| Companion display apps | 常時表示と小型画面 UX | 1画面に詰め込まず page / unread を分ける | Core2 / GRAY の入力差分を profile 化 |

## 評価基準

- 実機なしでも simulator と sample telemetry で代表フローを検証できること。
- pairing token と release asset privacy 境界があること。
- Core2 / GRAY の入力差分が仕様と実装で追えること。
- 実機未実施範囲を release notes に明記し、stable release と誤認させないこと。

## 結論

closed alpha の競争軸は「Codex 専用の小型物理通知端末を、実機前でも検証可能な契約で切り出すこと」です。MVP は機能の多さよりも、adapter 境界、sample replay、manual test への橋渡しを優先します。
