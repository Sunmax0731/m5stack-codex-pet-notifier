# Release Checklist

## Documentation

- [x] README に用途、対象 device、制約、検証コマンドがある。
- [x] requirements、specification、design、architecture、implementation plan、test plan が実装と一致している。
- [x] Core2 と GRAY の入力差分が明記されている。
- [x] Codex App 内部 API へ未確認依存していない。
- [x] pet sprite と会話本文の privacy 境界が整理されている。

## Implementation

- [x] Host Bridge model が pairing token を発行できる。
- [x] LAN Host Bridge が HTTP pairing / polling / replay / device event 受信を提供する。
- [x] Codex relay が clipboard / stdin / file から `answer.completed` を送信できる。
- [x] clipboard relay が日本語本文を UTF-8 として保持できる。
- [x] token なし / 誤 token device event を拒否できる。
- [x] simulator が実機なしで代表フローを再生できる。
- [x] 長文回答を page 分割できる。
- [x] 日本語回答を UTF-8 境界で page / line 分割し、日本語フォントで表示できる。
- [x] ボタン返信が Host Bridge へ届く。
- [x] firmware が Core2 / GRAY target を分け、Wi-Fi / HTTP polling / screen state / input event を実装している。

## Verification

- [x] `npm test` で代表シナリオを検証する。
- [x] `npm run bridge:smoke` で LAN Host Bridge を検証する。
- [x] `scripts/codex-relay-smoke.mjs` で Codex relay を検証する。
- [x] `docs/platform-runtime-gate.json` を生成する。
- [x] `dist/validation-result.json` を生成する。
- [x] Core2 実機で build / upload / Wi-Fi / pairing / Codex relay answer を確認する。
- [ ] Core2 実機で日本語 glyph を目視確認した。ユーザー手動。
- [ ] GRAY 実機で主要フローを確認した。今回対象外。
- [x] 実機未実施項目が manual test と release notes に残っている。

## Distribution

- [x] docs ZIP を生成する。
- [x] firmware build / upload 証跡を redacted JSON と manual docs に残す。
- [x] prerelease 本文に実機未実施範囲を書く。
- [x] token、host IP、個人 pet sprite を release asset へ含めない。
- [x] local Wi-Fi config を含む firmware binary は release asset にしない。
- [x] GitHub prerelease 作成後に `docs/release-evidence.json` を実 URL で更新する。
