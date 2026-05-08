# QCDS Strict Gap Analysis

## Pass

- Host Bridge mock、schema、simulator、device profile が実装済み。
- `npm test` で runtime gate、representative suite、QCDS guard が通る。
- release notes、manual test、security/privacy、traceability、competitive benchmark が揃っている。
- docs ZIP を生成できる。
- Core2 target を `COM4` の M5Stack へ upload し、2.4GHz Wi-Fi 接続を serial log で確認済み。

## Gap

| Gap | Impact | Handling |
| --- | --- | --- |
| Core2 touch / swipe 未確認 | 物理操作の実 UX が未確定 | prerelease に限定し manual test に残す |
| GRAY 実機未確認 | button / IMU fallback の閾値が未確定 | prerelease に限定し manual test に残す |
| 実 Codex adapter 未実装 | Codex App 連携は mock 境界まで | adapter 差し替え点として隔離 |
| firmware binary 配布未整備 | release asset として binary はまだ分離していない | docs release と scaffold のみにする |

## Evaluation Ceiling

実機確認は Core2 target の upload と Wi-Fi 接続までです。touch、button、IMU、GRAY、実 Codex adapter が未確認のため `S+` は付けません。ただし platform runtime gate は simulator / mock device / telemetry / adapter / safety boundary を通しており、さらに Core2 target の LAN 接続も確認できたため、closed alpha prerelease として `A-` 以上は許容します。
