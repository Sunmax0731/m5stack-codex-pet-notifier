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
| Core2 touch / swipe 未確認 | firmware 分岐は実装済みだが物理操作の実 UX が未確定 | prerelease に限定し manual test に残す |
| GRAY 実機未確認 | button / IMU fallback の閾値が未確定 | 今回対象外として manual test に明記 |
| 実 Codex App 内部 API 未使用 | 非公開 API scraping を避け、relay source に限定 | 公開 adapter API が出た場合に source を追加 |
| firmware binary 配布未整備 | release asset として binary はまだ分離していない | docs release と scaffold のみにする |

## Evaluation Ceiling

実機確認は Core2 target の upload、Wi-Fi 接続、pairing、A button reply、Codex relay answer までです。Core2 touch / swipe、GRAY、長時間運用、実 Codex App 内部 API 連携が未確認または対象外のため `S+` は付けません。ただし platform runtime gate は simulator / mock device / telemetry / adapter / safety boundary を通しており、Core2 target の LAN 接続も確認できたため、closed alpha prerelease として `A-` 以上は許容します。
