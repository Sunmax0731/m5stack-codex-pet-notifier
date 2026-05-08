# テスト計画

## 自動検証

| Test | 内容 | Evidence |
| --- | --- | --- |
| schema validation | sample payload と代表シナリオが event schema に合格または期待どおり拒否される | `dist/validation-result.json` |
| host bridge auth | token なし、token 誤り、正しい token を検証する | `happy-path.securityBoundary` |
| event routing | pet、notification、answer、choice が device session へ届く | `happy-path.validEvents` |
| reply routing | A/B/C 返信が requestEventId 付きで host へ戻る | `happy-path.replyCount` |
| scroll model | 長文回答の分割、位置、末尾判定を検証する | `mixed-batch.scrollPages` |
| device profile | Core2 / GRAY の入力割り当て差分を検証する | `profileCovered` |
| platform gate | simulator、mock device、sample telemetry、adapter、安全境界を確認する | `docs/platform-runtime-gate.json` |

## Representative Suite

| Scenario | 目的 |
| --- | --- |
| `happy-path` | Core2 profile で pet、通知、回答、選択、返信、interaction、heartbeat を通す |
| `missing-required` | `eventId` 欠落 payload を拒否する |
| `warning` | insecure sprite 参照を warning として検出する |
| `mixed-batch` | 有効 payload、warning、4択不正 payload を同じ batch で扱う |

## 実機検証

Core2 / GRAY 実機テストは Codex では未実施です。手順は `docs/manual-test.md` に残し、release notes にも未実施範囲として明記します。
