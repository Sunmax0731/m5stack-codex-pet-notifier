# Release Checklist

## Documentation

- [x] README に用途、対象 device、制約、検証コマンドがある。
- [x] requirements、specification、design、architecture、implementation plan、test plan が実装と一致している。
- [x] Core2 と GRAY の入力差分が明記されている。
- [x] Codex App 内部 API へ未確認依存していない。
- [x] pet sprite と会話本文の privacy 境界が整理されている。
- [x] Dashboard GUI と手動確認手順がある。
- [x] hatch-pet asset 生成手順と ignored local header 方針がある。
- [x] Codex session 自動送信の opt-in 手順と privacy 境界がある。
- [x] Codex Hooks 連携の command 例と重複抑止方針がある。
- [x] Dashboard で最新 Codex session 回答を表示し M5Stack へ送る手順がある。
- [x] Dashboard から pet 表示倍率と text size を変更する手順がある。

## Implementation

- [x] Host Bridge model が pairing token を発行できる。
- [x] LAN Host Bridge が HTTP pairing / polling / replay / device event 受信を提供する。
- [x] Codex relay が clipboard / stdin / file から `answer.completed` を送信できる。
- [x] Codex session watcher が local JSONL から最近の user / assistant やり取りを `answer.completed` として送信できる。
- [x] Codex hook relay が hook command から one-shot session relay を実行できる。
- [x] Dashboard と CLI が `/codex/choice`、`/codex/pet` を送信できる。
- [x] Dashboard が `/codex/session/latest` と `/codex/session/publish` で最新 Codex 回答を表示/送信できる。
- [x] Dashboard が `/codex/display` で pet display area と text size を `1..8` で送信できる。
- [x] clipboard relay が日本語本文を UTF-8 として保持できる。
- [x] token なし / 誤 token device event を拒否できる。
- [x] simulator が実機なしで代表フローを再生できる。
- [x] 長文回答を page 分割できる。
- [x] 日本語回答を UTF-8 境界で page / line 分割し、日本語フォントで表示できる。
- [x] ボタン返信が Host Bridge へ届く。
- [x] firmware が pet avatar animation を表示できる。
- [x] firmware が固定ヘッダーテキストを表示せず、pet surface を優先表示できる。
- [x] firmware が `display.settings_updated` による pet 表示倍率と text size の変更を処理できる。
- [x] `display.settings_updated` が pet 表示面積と text size を `1..8` の8段階で扱える。
- [x] firmware が hatch-pet local asset を優先表示し、未生成時は fallback avatar を表示できる。
- [x] firmware が Core2 / GRAY target を分け、Wi-Fi / HTTP polling / screen state / input event を実装している。

## Verification

- [x] `npm test` で代表シナリオを検証する。
- [x] `npm run bridge:smoke` で LAN Host Bridge を検証する。
- [x] `scripts/codex-relay-smoke.mjs` で Codex relay を検証する。
- [x] `scripts/codex-session-smoke.mjs` で Codex session auto relay を検証する。
- [x] hook relay の state file 重複抑止を `scripts/codex-session-smoke.mjs` で検証する。
- [x] `scripts/dashboard-smoke.mjs` で Dashboard、Choice / Pet / Display endpoint、最新 Codex 回答表示/送信 endpoint を検証する。
- [x] `docs/platform-runtime-gate.json` を生成する。
- [x] `dist/validation-result.json` を生成する。
- [x] Core2 実機で build / upload / Wi-Fi / pairing / Codex relay answer を確認する。
- [x] Core2 実機 firmware に hatch-pet local asset を含めて upload する。
- [ ] Core2 実機で日本語 glyph を目視確認した。ユーザー手動。
- [ ] Core2 実機で Dashboard Choice / hatch-pet animation を目視確認した。ユーザー手動。
- [ ] Core2 実機で Codex session auto relay を目視確認した。ユーザー手動。
- [ ] Core2 実機で Codex hook relay を目視確認した。ユーザー手動。
- [ ] Core2 実機で Dashboard 最新 Codex 回答送信を目視確認した。ユーザー手動。
- [ ] Core2 実機で Display 設定による固定ヘッダーテキスト削除、pet `8/8` 最大表示、text size 変更を目視確認した。ユーザー手動。
- [ ] GRAY 実機で主要フローを確認した。今回対象外。
- [x] 実機未実施項目が manual test と release notes に残っている。

## Distribution

- [x] docs ZIP を生成する。
- [x] firmware build / upload 証跡を redacted JSON と manual docs に残す。
- [x] prerelease 本文に実機未実施範囲を書く。
- [x] token、host IP、個人 pet sprite を release asset へ含めない。
- [x] `firmware/include/pet_asset.local.h` を release asset へ含めない。
- [x] pet asset generator が scale `1..8` ごとの Core2 用高解像度 frame を生成できる。
- [x] firmware が scale-specific frame を Core2 で選択し、GRAY では flash 制約のため base frame fallback を使える。
- [x] local Wi-Fi config を含む firmware binary は release asset にしない。
- [x] GitHub prerelease 作成後に `docs/release-evidence.json` を実 URL で更新する。
