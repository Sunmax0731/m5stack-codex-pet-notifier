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
| Codex relay smoke | relay CLI と `/codex/answer` から `answer.completed` を queue / poll できることを検証する | `scripts/codex-relay-smoke.mjs` |
| Codex session smoke | local session JSONL から最新 user / assistant やり取りを抽出し、`answer.completed` として queue / poll できることを検証する | `scripts/codex-session-smoke.mjs`、`dist/codex-session-smoke-result.json` |
| Codex hook relay smoke | hook process 相当の one-shot relay が state file で重複を抑止することを検証する | `scripts/codex-session-smoke.mjs` |
| clipboard UTF-8 relay smoke | 日本語 clipboard 本文を `answer.completed` として壊さず送れることを検証する | `scripts/codex-relay-smoke.mjs` |
| dashboard smoke | Dashboard asset、`/debug/snapshot`、`/codex/choice`、`/codex/pet`、inbound reply summary を検証する | `scripts/dashboard-smoke.mjs`、`dist/dashboard-smoke-result.json` |
| dashboard browser smoke | Dashboard を desktop / mobile viewport で表示し、非 blank と主要 UI を確認する | `dist/dashboard-smoke.png`、`dist/dashboard-mobile-smoke.png` |
| firmware 日本語表示 source gate | firmware が日本語フォントと UTF-8 code point 境界のページングを使うことを検証する | `scripts/validate.mjs` |
| firmware pet animation source gate | firmware が pet avatar animation を含むことを検証する | `scripts/validate.mjs` |
| hatch-pet asset source gate | local pet asset generator、firmware compile-time gate、ignored header を検証する | `scripts/validate.mjs` |
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
| Core2 re-pairing | Host Bridge 再起動後に invalid token を検出し、再pairingへ戻る | `docs/hardware-runtime-evidence.json` |
| Core2 Codex answer | `npm run codex:answer` で Core2 に Answer を表示する | `docs/hardware-runtime-evidence.json` |
| Core2 Japanese answer | 日本語本文の `answer.completed` を送り、文字化けがないことを目視する | `docs/hardware-runtime-evidence.json` |
| Core2 Clipboard Japanese answer | clipboard 経由の日本語本文を送り、文字化けがないことを目視する | `docs/hardware-runtime-evidence.json` |
| Core2 Codex session auto relay | `codex:sessions` で最近の Codex session の最新やり取りを自動送信し、Core2 の Answer 画面を確認する | `docs/codex-relay-manual-check.md` |
| Core2 Codex hook relay | Codex Hooks または `codex:hook` 手動実行で最新やり取りを送信し、Core2 の Answer 画面を確認する | `docs/codex-relay-manual-check.md` |
| Core2 hatch-pet animation | `%USERPROFILE%\.codex\pets` 由来の local asset が header に表示され、state 連動で animation することを目視する | `docs/gui-tools-manual-check.md` |
| Core2 ABC GUI workflow | Dashboard から Choice を送り、Core2 A/B/C 返信が Dashboard inbound に出ることを確認する | `docs/gui-tools-manual-check.md` |
| Core2 touch / swipe | footer touch、choice touch、answer swipe を確認する | `docs/manual-test.md` |

GRAY 実機、GRAY IMU、長時間運用、実 Codex App 内部 API 連携の手動テストは Codex では未実施です。手順と対象外範囲は `docs/manual-test.md`、`docs/host-bridge-manual-check.md`、`docs/codex-relay-manual-check.md` に残し、release notes にも明記します。
