# AGENTS

このリポジトリ相当フォルダは、M5Stack Core2 / GRAY向けのCodexペット通知端末を実装するための計画・設計・リリース準備を扱います。

## Scope

- Root: `D:\AI\IoT\m5stack-codex-pet-notifier`
- Source idea: `D:\AI\IDEAS\IoT\created_idea_018_m5stack-codex-pet-notifier`
- Product surface: M5Stack firmware, host bridge, simulator, sample payloads, release docs

## Working Rules

- 実装前に `docs/requirements.md`、`docs/specification.md`、`docs/design.md` を読む。
- Codex App内部仕様へ直接依存せず、Host Bridgeのイベント契約を経由する。
- Core2とGRAYの入力差分を吸収するdevice profileを用意する。
- 実機がない段階でも、simulator、mock device、sample telemetryで代表フローを検証できるようにする。
- token、host IP、個人ペット素材、会話本文をrelease assetへ含めない。

## Release Boundary

リリース前に、Core2実機、GRAY実機、host bridge、simulator、sample payload、security/privacy checklist、manual test結果をそろえる。実機未確認のまま公開する場合は、GitHub Releaseをprereleaseにし、未確認範囲をrelease本文へ明記する。
