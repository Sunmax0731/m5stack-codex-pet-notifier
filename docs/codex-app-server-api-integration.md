# Codex App 公開 API 連携準備

## 現在の判断

実 Codex App 連携は、非公開内部 API や画面 scraping ではなく、公開されている Codex app-server protocol を第一候補にします。OpenAI 公式 docs では app-server が rich client 向けの JSON-RPC 2.0 interface として説明され、`stdio` と実験的 `websocket` transport が示されています。

参照:

- https://developers.openai.com/codex/app-server
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/cli

## 実装済みの準備

- `src/codex-adapter/appServerAdapter.mjs` に app-server 用 JSON-RPC message builder、transport safety gate、stdio session helper を追加した。
- stdio session helper は request timeout、child process exit / error 時の pending request 解放、stderr sample の redaction を持つ。
- `src/codex-adapter/adapterRegistry.mjs` で `local-session-jsonl`、`codex-hook-relay`、`codex-app-server` を catalog 化した。
- `scripts/codex-app-server-adapter-smoke.mjs` で `initialize`、`thread/start`、`turn/start`、transport gate、adapter registry を検証する。
- `tools/codex-app-server-runtime-probe.mjs` で実 `codex app-server` を起動し、schema 生成、`initialize`、`thread/start`、必要に応じて `turn/start` を実行する。
- `tools/adapter-review.mjs` で adapter 状態を `dist/adapter-review-result.json` と `docs/adapter-review-result.json` に出力する。
- `schemas/codex-app-server/` に `codex app-server generate-json-schema --out schemas/codex-app-server` の結果を固定した。

## 2026-05-11 実接続 evidence

```powershell
cmd.exe /d /s /c npm run codex:app-server:probe -- --include-turn
```

結果は `docs/codex-app-server-runtime-probe-result.json` に保存しています。現環境では `codex-cli 0.130.0-alpha.5` で `initialize`、`thread/start`、`turn/start` が成功し、thread id と turn id を受信しました。probe は本文を evidence に保存しません。

## 安全境界

- `experimentalApi` は既定 false とする。必要になった method / field は docs と validation を追加してから明示 opt-in する。
- WebSocket は loopback のみを既定許容とし、非 loopback は capability token または signed bearer token を必須にする。
- session 本文は M5Stack への transient event として扱い、release evidence に保存しない。
- private Codex App data の scraping、local browser DOM 読み取り、未公開 endpoint 呼び出しは対象外。

## 次の実装タスク

- app-server の turn notification から `answer.completed` と `prompt.choice_requested` へ変換する mapper を追加する。
- mapper 追加後も local-session / hook relay を fallback adapter として維持する。
