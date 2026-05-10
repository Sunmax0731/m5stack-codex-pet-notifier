# QCDS Strict Gap Analysis

## Pass

- Host Bridge mock、schema、simulator、device profile が実装済み。
- `npm test` で runtime gate、representative suite、QCDS guard が通る。
- release notes、manual test、security/privacy、traceability、competitive benchmark が揃っている。
- docs ZIP を生成できる。
- Core2 target を USB serial 自動検出 helper で M5Stack へ upload し、2.4GHz Wi-Fi 接続を serial log で確認対象にしている。最新確認では `COM3` を検出して upload 成功、過去証跡では `COM4` でも upload 済み。
- Codex App Server adapter smoke、adapter review、long-run source gate、signing readiness check を追加済み。

## Gap

| Gap | Impact | Handling |
| --- | --- | --- |
| Core2 touch / swipe 未確認 | firmware 分岐は実装済みだが物理操作の実 UX が未確定 | prerelease に限定し manual test に残す |
| GRAY 実機 / GRAY IMU 対象外 | Core2 以外の実機UXはrelease targetに含めない | manual test と release notes に対象外として明記 |
| 長時間 soak 未実施 | 8時間以上の Wi-Fi / polling / queue / heartbeat の実運用証跡が未確定 | long-run diagnostics と backoff 実装は追加済み。formal release 前に soak test |
| 実 Codex App Server 未接続 | adapter は public interface 準備と smoke まで | 実 App Server process で thread/start と turn/start を確認 |
| 署名付き MSI / MSIX 未署名 | template と readiness check はあるが実証明書で未検証 | 実署名証明書で package / verify / installer 起動を確認 |
| firmware binary 配布未整備 | release asset として binary はまだ分離していない | docs release と scaffold のみにする |

## Evaluation Ceiling

実機確認は Core2 target の upload、Wi-Fi 接続、pairing、A button reply、Codex relay answer と、その後のユーザー目視確認までです。GRAY 実機と GRAY IMU は対象外です。長時間 soak、実 Codex App Server 接続、実署名 MSI / MSIX が未確認のため `S+` は付けません。ただし platform runtime gate は simulator / mock device / telemetry / adapter / safety boundary を通しており、Core2 target の LAN 接続も確認できたため、beta prerelease として `A-` 以上は許容します。
