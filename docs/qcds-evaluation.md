# QCDS Evaluation

QCDS は Quality、Cost、Delivery、Satisfaction として評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

## Current Grade

| Area | Grade | Reason |
| --- | --- | --- |
| Quality | S- | schema、Host Bridge mock、simulator、representative suite、runtime gate、security/privacy が自動検証済み。実機未確認のため S+ ではない |
| Cost | A+ | Node.js 標準ライブラリのみで検証でき、firmware は scaffold に留めて導入負荷を抑えている |
| Delivery | A+ | docs、samples、schemas、runtime evidence、release notes、docs ZIP を prerelease へ出せる |
| Satisfaction | S- | 導入、操作、未実施範囲、次の手動テストが明確。実機 UX 未確認のため S+ ではない |

## Evidence

- `cmd.exe /d /s /c npm test`
- `dist/validation-result.json`
- `docs/platform-runtime-gate.json`
- `docs/qcds-strict-metrics.json`
- `docs/manual-test.md`
- `docs/releases/v0.1.0-alpha.1.md`

## Manual Test Cap

Core2 / GRAY 実機テストは Codex では未実施です。手動未実施のため `S+` は付けません。
