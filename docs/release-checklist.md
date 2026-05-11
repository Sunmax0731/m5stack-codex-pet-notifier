# Release Checklist

## Documentation

- [x] README に用途、対象 device、制約、検証コマンドがある。
- [x] requirements、specification、design、architecture、implementation plan、test plan が実装と一致している。
- [x] Core2 release target と button reference preview の入力差分、GRAY 実機 / GRAY IMU 対象外が明記されている。
- [x] Codex App 内部 API へ未確認依存していない。
- [x] pet sprite と会話本文の privacy 境界が整理されている。
- [x] Dashboard GUI と手動確認手順がある。
- [x] M5Stack Choice Gate の配布用 `AGENTS.md` / `SKILL.md` / portable JSON block の手順がある。
- [x] hatch-pet asset 生成手順と ignored local header 方針がある。
- [x] Codex session 自動送信の opt-in 手順と privacy 境界がある。
- [x] Codex Hooks 連携の command 例と重複抑止方針がある。
- [x] Codex App Server public interface adapter、transport gate、adapter review の手順がある。
- [x] 手動 gate の自動化方針と `formal:automation` の手順がある。
- [x] Dashboard で最新 Codex session 回答を表示し M5Stack へ送る手順がある。
- [x] Dashboard の M5Stack 表示プレビューから pet 表示倍率、text size、render FPS、motion step を変更する手順がある。
- [x] 正式リリースへ向けた Codex decision request、`codex:decision:wait`、A/B/C 返信 workflow の手順がある。
- [x] pet mood、Core2 gesture、long press から Choice request への workflow の手動確認手順がある。
- [x] Windows installer、hidden dashboard launcher、installer package の手順がある。
- [x] 署名付き MSI / MSIX の template と signing readiness check の手順がある。

## Implementation

- [x] Host Bridge model が pairing token を発行できる。
- [x] LAN Host Bridge が HTTP pairing / polling / replay / device event 受信を提供する。
- [x] Codex relay が clipboard / stdin / file から `answer.completed` を送信できる。
- [x] Codex session watcher が local JSONL から最近の user / assistant やり取りを `answer.completed` として送信できる。
- [x] Codex hook relay が hook command から one-shot session relay を実行できる。
- [x] Codex app-server adapter が `initialize`、`thread/start`、`turn/start` の public JSON-RPC message を組み立てられる。
- [x] Codex app-server runtime probe が実 `codex app-server` で `initialize`、`thread/start`、`turn/start` を確認できる。
- [x] adapter review が private API scraping を禁止し、fallback adapter と public API workstream を区別できる。
- [x] Dashboard と CLI が `/codex/decision`、`/codex/choice`、`/codex/pet` を送信でき、CLI は `device.reply_selected` を待てる。
- [x] Dashboard が `/codex/session/latest` と `/codex/session/publish` で最新 Codex 回答を表示/送信できる。
- [x] Dashboard が `/pet/current/manifest` と `/pet/current/spritesheet.webp` で現在の pet を preview できる。
- [x] Dashboard が `/codex/display` で pet display area を `1..32`、text size を `1..8`、render FPS を `4..20`、motion step を `120..800ms` で送信できる。
- [x] Dashboard の command modal が tab とパラメータフォームを持ち、localhost allowlist command だけを実行できる。
- [x] Host Bridge を hidden background process として起動する `bridge:start:bg` がある。
- [x] Dashboard の command modal から Host Bridge を background restart できる。
- [x] clipboard relay が日本語本文を UTF-8 として保持できる。
- [x] token なし / 誤 token device event を拒否できる。
- [x] simulator が実機なしで代表フローを再生できる。
- [x] 長文回答を page 分割できる。
- [x] 日本語回答を UTF-8 境界で page / line 分割し、日本語フォントで表示できる。
- [x] ボタン返信が Host Bridge へ届く。
- [x] firmware が pet avatar animation を表示できる。
- [x] firmware が pet avatar box を `M5Canvas` Sprite buffer へ描画し、animation tick では画面全体の黒塗りを避けて本文 overlay を安定表示できる。
- [x] firmware が固定ヘッダーテキストを表示せず、pet surface を優先表示できる。
- [x] firmware が `display.settings_updated` による pet 表示倍率、text size、render FPS、motion step の変更を処理できる。
- [x] `display.settings_updated` が pet 表示面積を `1..32`、text size を `1..8`、render FPS を `4..20`、motion step を `120..800ms` で扱える。
- [x] firmware が hatch-pet local asset を優先表示し、未生成時は fallback avatar を表示できる。
- [x] firmware が Core2 target で Wi-Fi / HTTP polling / screen state / input event を実装している。
- [x] Host Bridge と firmware が長時間運用向けの queue/log 上限、stale diagnostics、HTTP timeout、Wi-Fi / poll backoff を持つ。
- [x] firmware、simulator、schema、Dashboard が pet mood を state と分けて扱える。
- [x] Core2 touch gesture と button reference long press を `device.pet_interacted` として返せる。
- [x] Host Bridge が long press / button long press から `prompt.choice_requested` を同一 device に queue できる。
- [x] `start-dashboard.bat` が hidden PowerShell launcher 経由で background Bridge と browser open を実行できる。
- [x] Windows user-local installer が Desktop / Start Menu shortcut と install manifest を作成できる。
- [x] signed installer pipeline が WiX source / MSIX payload を生成し、release 環境では署名と verify まで進められる。
- [x] M5Stack Choice Gate 配布 ZIP 生成 script がある。

## Verification

- [x] `npm test` で代表シナリオを検証する。
- [x] `npm run bridge:smoke` で LAN Host Bridge を検証する。
- [x] `scripts/codex-relay-smoke.mjs` で Codex relay を検証する。
- [x] `scripts/codex-session-smoke.mjs` で Codex session auto relay を検証する。
- [x] hook relay の state file 重複抑止を `scripts/codex-session-smoke.mjs` で検証する。
- [x] `scripts/codex-app-server-adapter-smoke.mjs` で Codex App Server adapter を検証する。
- [x] `codex:app-server:probe -- --include-turn` で実 Codex App Server 接続を検証する。
- [x] `tools/adapter-review.mjs` で実 adapter 見直しを検証する。
- [x] `tools/windows-signing-check.mjs` で署名 readiness を JSON 化する。
- [x] `tools/signed-installer-pipeline.mjs` で WiX source / MSIX payload generation を検証する。
- [x] `scripts/dashboard-smoke.mjs` で Dashboard、Decision / Pet / Display endpoint、current pet preview、section collapse、tooltip、command modal tabs、runtime status、allowlist command execution、最新 Codex 回答表示/送信 endpoint を検証する。
- [x] `docs/platform-runtime-gate.json` を生成する。
- [x] `dist/validation-result.json` を生成する。
- [x] Core2 実機で build / upload / Wi-Fi / pairing / Codex relay answer を確認する。
- [x] Core2 実機 firmware に hatch-pet local asset を含めて upload する。
- [x] Core2 実機で日本語 glyph を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Dashboard Choice / hatch-pet animation を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Codex session auto relay を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Codex hook relay を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Dashboard 最新 Codex 回答送信を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Display 設定による固定ヘッダーテキスト削除、pet `32/32` 超拡大表示、text size 変更、render FPS / motion step 変更を目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で Sprite buffer により pet animation 中の画面全体、本文、footer のちらつきが抑えられていることを目視確認した。ユーザー報告で確認済み。
- [x] Core2 実機で pet mood、single tap、double tap、long press、swipe、long press Choice request を目視確認した。ユーザー報告で確認済み。
- [x] Windows 実環境で installer shortcut と hidden dashboard launcher を確認した。ユーザー報告で確認済み。
- [x] GRAY 実機と GRAY IMU を release target 外として扱う。
- [x] Core2 8時間 soak を formal release 前に確認する。Wi-Fi AP停止 / 復帰は今回対象外。
- [ ] 実署名 MSI / MSIX を formal release 前に確認する。実 Codex App Server 接続は確認済み。
- [x] 実機未実施項目が manual test と release notes に残っている。

## Distribution

- [x] docs ZIP を生成する。
- [x] beta installer ZIP を生成する。
- [x] M5Stack Choice Gate 配布 ZIP を生成する。
- [x] firmware build / upload 証跡を redacted JSON と manual docs に残す。
- [x] prerelease 本文に実機未実施範囲を書く。
- [x] token、host IP、個人 pet sprite を release asset へ含めない。
- [x] `firmware/include/pet_asset.local.h` を release asset へ含めない。
- [x] pet asset generator が scale `1..8` ごとの Core2 用高解像度 frame を生成できる。
- [x] firmware が scale-specific frame を Core2 で選択できる。
- [x] local Wi-Fi config を含む firmware binary は release asset にしない。
- [x] GitHub prerelease 作成後に `docs/release-evidence.json` を実 URL で更新する。
