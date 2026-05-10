# テスト計画

## 自動検証

| Test | 内容 | Evidence |
| --- | --- | --- |
| schema validation | sample payload と代表シナリオが event schema に合格または期待どおり拒否される | `dist/validation-result.json` |
| host bridge auth | token なし、token 誤り、正しい token を検証する | `happy-path.securityBoundary` |
| event routing | pet、display、notification、answer、choice が device session へ届く | `happy-path.validEvents` |
| reply routing | A/B/C 返信が requestEventId 付きで host へ戻る | `happy-path.replyCount` |
| scroll model | 長文回答の分割、位置、末尾判定を検証する | `mixed-batch.scrollPages` |
| device profile | Core2 release profile と button reference preview の入力割り当て差分を検証する | `profileCovered` |
| LAN bridge smoke | HTTP pairing、sample replay、polling、device reply 受信を検証する | `npm run bridge:smoke` |
| Codex relay smoke | relay CLI と `/codex/answer` から `answer.completed` を queue / poll できることを検証する | `scripts/codex-relay-smoke.mjs` |
| Codex session smoke | local session JSONL から最新 user / assistant やり取りを抽出し、`answer.completed` として queue / poll できることを検証する | `scripts/codex-session-smoke.mjs`、`dist/codex-session-smoke-result.json` |
| Codex hook relay smoke | hook process 相当の one-shot relay が state file で重複を抑止することを検証する | `scripts/codex-session-smoke.mjs` |
| Codex app-server adapter smoke | public Codex App Server adapter の `initialize`、`thread/start`、`turn/start`、transport gate を検証する | `scripts/codex-app-server-adapter-smoke.mjs`、`dist/codex-app-server-adapter-smoke-result.json` |
| Codex app-server runtime probe | 実 `codex app-server` を起動し、schema 生成、`initialize`、`thread/start`、`turn/start` を確認する | `npm run codex:app-server:probe -- --include-turn`、`docs/codex-app-server-runtime-probe-result.json` |
| adapter review | local session JSONL、hook relay、app-server adapter の役割と private API scraping 禁止を検証する | `tools/adapter-review.mjs`、`docs/adapter-review-result.json` |
| clipboard UTF-8 relay smoke | 日本語 clipboard 本文を `answer.completed` として壊さず送れることを検証する | `scripts/codex-relay-smoke.mjs` |
| dashboard smoke | Dashboard asset、`/debug/snapshot`、`/debug/runtime`、`/debug/commands/run`、`/codex/decision`、`/codex/pet`、`/codex/display`、`/pet/current/manifest`、`/codex/session/latest`、`/codex/session/publish`、inbound reply summary、collapse、command modal tabs を検証する | `scripts/dashboard-smoke.mjs`、`dist/dashboard-smoke-result.json` |
| dashboard browser smoke | Dashboard を desktop / mobile viewport で表示し、非 blank と主要 UI を確認する | `dist/dashboard-smoke.png`、`dist/dashboard-mobile-smoke.png` |
| firmware 日本語表示 source gate | firmware が日本語フォントと UTF-8 code point 境界のページングを使うことを検証する | `scripts/validate.mjs` |
| firmware pet animation source gate | firmware が pet avatar animation、runtime render FPS、motion step、`M5Canvas` Sprite buffer、pet box redraw path を含むことを検証する | `scripts/validate.mjs` |
| long-run source gate | Host Bridge queue/log 上限、stale diagnostics、firmware HTTP timeout、Wi-Fi / poll backoff、連続失敗時の復帰を検証する | `scripts/validate.mjs` |
| hatch-pet asset source gate | local pet asset generator、firmware compile-time gate、ignored header、標準 9 行 atlas、row-aware frame selection を検証する | `scripts/validate.mjs` |
| signing readiness | Windows SDK / WiX / 署名用 env の準備状況を JSON へ出す | `npm run installer:signing:check`、`dist/windows-signing-readiness.json` |
| signed installer pipeline | installer ZIP payload から WiX source / MSIX payload を生成し、release 環境では署名と verify まで行う | `npm run installer:signed:pipeline`、`docs/signed-installer-pipeline-result.json` |
| Core2 soak runner | 実機常時接続の heartbeat age、stale、droppedEvents を収集する。今回の実行では Wi-Fi AP停止 / 復帰を含めない | `npm run core2:soak -- --duration-min=480 --skip-wifi-interruption`、`docs/core2-soak-result.json` |
| formal gate automation | `npm test`、Core2 soak evidence、署名 pipeline、Codex App Server probe をまとめて確認する | `npm run formal:automation -- --include-turn`、`docs/formal-release-automation-result.json` |
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
| Core2 upload | USB 接続された Core2 へ firmware を書き込む | `npm run firmware:upload:core2` |
| Core2 LAN | 2.4GHz Wi-Fi、pairing、Host Bridge sample poll を serial log で確認する | `docs/hardware-runtime-evidence.json` |
| Core2 re-pairing | Host Bridge 再起動後に invalid token を検出し、再pairingへ戻る。既存実機が旧 `paired-*` token で poll した場合は、Host Bridge が token を再取り込みして queued display event を配信する | `bridge:smoke`、`docs/hardware-runtime-evidence.json` |
| Core2 Codex answer | `npm run codex:answer` で Core2 に Answer を表示する | `docs/hardware-runtime-evidence.json` |
| Core2 Japanese answer | 日本語本文の `answer.completed` を送り、文字化けがないことを目視する | `docs/hardware-runtime-evidence.json` |
| Core2 Clipboard Japanese answer | clipboard 経由の日本語本文を送り、文字化けがないことを目視する | `docs/hardware-runtime-evidence.json` |
| Core2 Codex session auto relay | `codex:sessions` で最近の Codex session の最新やり取りを自動送信し、Core2 の Answer 画面を確認する | `docs/codex-relay-manual-check.md` |
| Core2 Codex hook relay | Codex Hooks または `codex:hook` 手動実行で最新やり取りを送信し、Core2 の Answer 画面を確認する | `docs/codex-relay-manual-check.md` |
| Dashboard latest Codex answer | Dashboard の `最近の Codex 回答` panel で最新 assistant 回答を表示し、`M5Stackへ送信` で Core2 Answer 画面を確認する | `docs/gui-tools-manual-check.md` |
| Dashboard current pet preview | Dashboard preview が `/pet/current/manifest` の現在の hatch-pet spritesheet を表示し、`/pet/packages` と path override で任意の local hatch-pet package を切り替えられる | `docs/gui-tools-manual-check.md` |
| Codex decision request | `codex:decision` または Dashboard Decision tab から三択を送り、Core2 A/B/C 返信を確認する | `docs/gui-tools-manual-check.md` |
| Core2 hatch-pet animation | `%USERPROFILE%\.codex\pets` 由来の local asset が header に表示され、state / mood / gesture 連動でキャラクターイラストの表情 / 姿勢 row が切り替わることを目視する | `docs/gui-tools-manual-check.md` |
| Core2 display settings | Dashboard から pet display area を `1..32`、text size を `1..8`、render FPS を `4..20`、motion step を `120..800ms`、RGBA、beep を送り、Core2 の固定ヘッダーテキスト削除、pet 超拡大、文字サイズ変化、pose 切替頻度変化、色変更、answer beep を目視する | `docs/gui-tools-manual-check.md` |
| Dashboard Core2 / button reference preview | Dashboard の device preview を Core2 / button reference で切り替え、320x240 layout、text overlay、2カラム配置を確認する | `docs/gui-tools-manual-check.md` |
| Core2 scale-specific pet asset | `pet:asset` が生成した scale-specific frame を使い、pet display area `1/32`、`8/32`、`16/32`、`32/32` で低解像度 base frame のブロック拡大にならないことと超拡大構図を目視する | `docs/gui-tools-manual-check.md` |
| Core2 sprite-buffered pet redraw | pet animation 中に画面全体の黒塗りや Answer / Choice / footer text の明滅がなく、ちらつきが抑えられることを目視する | `docs/gui-tools-manual-check.md` |
| Core2 ABC GUI workflow | Dashboard から Choice を送り、Core2 A/B/C 返信が Dashboard inbound に出ることを確認する | `docs/gui-tools-manual-check.md` |
| Core2 touch / swipe | footer touch、choice touch、answer swipe を確認する | `docs/manual-test.md` |

GRAY 実機と GRAY IMU は release target 外です。長時間 soak は Core2 実機環境が必要です。今回の soak では Wi-Fi AP停止 / 復帰を含めません。実 Codex App Server 接続は `codex:app-server:probe -- --include-turn` で確認済みです。署名付き MSI / MSIX は pipeline 化済みですが、現環境では WiX / Windows SDK / 署名証明書が未導入のため release 環境で再実行します。複数 M5Stack 同時接続は今回対象外で、今後のアップデート対象です。
