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
| LAN bridge smoke | HTTP pairing、sample replay、polling、device reply 受信を検証する | `npm run bridge:smoke` |
| platform gate | simulator、mock device、sample telemetry、adapter、安全境界を確認する | `docs/platform-runtime-gate.json` |

## Representative Suite

| Scenario | 目的 |
| --- | --- |
| `happy-path` | Core2 profile で pet、通知、回答、選択、返信、interaction、heartbeat を通す |
| `missing-required` | `eventId` 欠落 payload を拒否する |
| `warning` | insecure sprite 参照を warning として検出する |
| `mixed-batch` | 有効 payload、warning、4択不正 payload を同じ batch で扱う |

## Firmware / 実機検証

| Test | 内容 | Evidence |
| --- | --- | --- |
| Core2 build | PlatformIO Core2 target を build する | `pio run -e m5stack-core2` |
| GRAY build | PlatformIO GRAY target を build する | `pio run -e m5stack-gray` |
| Core2 upload | USB 接続された Core2 へ firmware を書き込む | `pio run -e m5stack-core2 -t upload --upload-port COM4` |
| Core2 LAN | 2.4GHz Wi-Fi、pairing、Host Bridge sample poll を serial log で確認する | `docs/hardware-runtime-evidence.json` |

GRAY 実機、物理 A/B/C、Core2 touch、GRAY IMU、実 Codex adapter の手動テストは Codex では未実施です。手順は `docs/manual-test.md` と `docs/host-bridge-manual-check.md` に残し、release notes にも未実施範囲として明記します。
