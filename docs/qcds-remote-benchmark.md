# QCDS Remote Benchmark

厳格 QCDS の基準は、成熟した既存 repo の運用例から以下を採用します。

| Benchmark | 採用する水準 |
| --- | --- |
| 代表シナリオ | happy path だけでなく、missing required、warning、mixed batch を含める |
| metrics JSON | grade を機械検証し、定義外の値を失敗させる |
| runtime gate | 対象 platform と実装仕様が一致していることを確認する |
| release evidence | prerelease、latest=false、asset、git clean を JSON で残す |
| manual test | Codex 未実施とユーザー実施を明確に分ける |

本 repo では IoT 向けに simulator、mock device、sample telemetry、device / host adapter、security/privacy 境界を runtime gate の必須 signal にしています。
