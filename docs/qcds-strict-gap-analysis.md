# QCDS Strict Gap Analysis

## Pass

- Host Bridge mock、schema、simulator、device profile が実装済み。
- `npm test` で runtime gate、representative suite、QCDS guard が通る。
- release notes、manual test、security/privacy、traceability、competitive benchmark が揃っている。
- docs ZIP を生成できる。

## Gap

| Gap | Impact | Handling |
| --- | --- | --- |
| Core2 実機未確認 | touch / swipe / Wi-Fi の実 UX が未確定 | prerelease に限定し manual test に残す |
| GRAY 実機未確認 | button / IMU fallback の閾値が未確定 | prerelease に限定し manual test に残す |
| 実 Codex adapter 未実装 | Codex App 連携は mock 境界まで | adapter 差し替え点として隔離 |
| firmware build 未確認 | binary 配布はまだ不可 | docs release と scaffold のみにする |

## Evaluation Ceiling

手動実機テスト未実施のため `S+` は付けません。ただし platform runtime gate は simulator / mock device / telemetry / adapter / safety boundary を通しているため、closed alpha prerelease として `A-` 以上は許容します。
