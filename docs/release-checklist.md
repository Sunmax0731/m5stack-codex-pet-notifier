# Release Checklist

## Documentation

- [x] README に用途、対象 device、制約、検証コマンドがある。
- [x] requirements、specification、design、architecture、implementation plan、test plan が実装と一致している。
- [x] Core2 と GRAY の入力差分が明記されている。
- [x] Codex App 内部 API へ未確認依存していない。
- [x] pet sprite と会話本文の privacy 境界が整理されている。

## Implementation

- [x] Host Bridge mock が pairing token を発行できる。
- [x] token なし / 誤 token device event を拒否できる。
- [x] simulator が実機なしで代表フローを再生できる。
- [x] 長文回答を page 分割できる。
- [x] ボタン返信が Host Bridge へ届く。
- [x] firmware scaffold が Core2 / GRAY target を分けている。

## Verification

- [x] `npm test` で代表シナリオを検証する。
- [x] `docs/platform-runtime-gate.json` を生成する。
- [x] `dist/validation-result.json` を生成する。
- [ ] Core2 実機で主要フローを確認した。
- [ ] GRAY 実機で主要フローを確認した。
- [x] 実機未実施項目が manual test と release notes に残っている。

## Distribution

- [x] docs ZIP を生成する。
- [x] prerelease 本文に実機未実施範囲を書く。
- [x] token、host IP、個人 pet sprite を release asset へ含めない。
- [x] GitHub prerelease 作成後に `docs/release-evidence.json` を実 URL で更新する。
