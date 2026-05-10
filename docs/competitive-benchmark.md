# Competitive Benchmark

## 比較対象

| 対象 | 強み | 採用する基準 | 本プロダクトの差分 |
| --- | --- | --- | --- |
| M5Stack UIFlow / Arduino examples | M5Stack の画面、ボタン、センサー実装例が豊富 | device profile と実機手順を明確にする | Codex 通知と pet interaction に特化 |
| Home Assistant + MQTT dashboards | IoT device と通知連携の標準的構成 | transport を将来差し替え可能にする | beta では broker 不要の Host Bridge にし、MQTT は将来差し替え候補に残す |
| Slack / GitHub desktop notifications | 通知の即時性が高い | 状態、重要度、返信導線を揃える | PC 画面外の物理端末で確認できる |
| Companion display apps | 常時表示と小型画面 UX | 1画面に詰め込まず page / unread を分ける | Core2 release profile と button reference preview を分離 |

## 評価基準

- 実機なしでも simulator と sample telemetry で代表フローを検証でき、実機ありでは LAN Host Bridge で sample event を確認できること。
- pairing token と release asset privacy 境界があること。
- Core2 release profile と button reference preview の入力差分が仕様と実装で追えること。GRAY 実機と GRAY IMU は対象外として扱うこと。
- pet 表情、touch gesture、A/B/C decision request の workflow が mock / simulator / firmware contract で追えること。
- 一般ユーザーが `npm` コマンドを覚えなくても dashboard を起動できる installer / launcher があること。
- 長時間運用、署名付き installer、公開 Codex App Server 連携へ進めるための readiness / adapter review があること。
- 実機未実施範囲を release notes に明記し、stable release と誤認させないこと。

## 結論

beta の競争軸は「Codex 専用の小型物理通知端末を、実機前でも検証可能で、実機接続時には LAN 内で表情、gesture、A/B/C decision request まで確認できる product platform として切り出すこと」です。stable release 前は、adapter 境界、sample replay、installer、manual test への橋渡しを優先します。
