# AGENTS

このリポジトリは M5Stack Core2 向け Codex ペット通知端末の Host Bridge、protocol、simulator、firmware scaffold、release docs を扱います。GRAY 実機と GRAY IMU は release target から外し、button reference preview は互換確認用に限定します。

## Scope

- Root: `D:\AI\IoT\m5stack-codex-pet-notifier`
- Source idea: `D:\AI\IoT\created_idea_018_m5stack-codex-pet-notifier`
- Product surface: Host Bridge、JSON event contract、M5Stack device profile、simulator、sample telemetry、firmware、Dashboard、Windows installer、beta release docs

## Working Rules

- 作業前に `README.md`、`AGENTS.md`、`SKILL.md` を読む。
- Codex App 内部 API へ直接依存せず、Host Bridge adapter の差し替え点に閉じ込める。
- 実機がない場合でも、simulator、mock device、sample telemetry、device / host adapter、security/privacy 境界を `npm test` で確認する。
- PlatformIO を repo root から実行する場合は `pio.exe run -d firmware ...` を使う。`pio.exe -d firmware run ...` はこの環境では失敗する。
- hatch-pet 由来の pet sprite は `tools/generate-pet-firmware-asset.py` で `firmware/include/pet_asset.local.h` に変換する。この local header は `.gitignore` 対象で、個人 pet sprite を commit しない。
- 長時間運用を触る場合は、queue/log 上限、stale device diagnostics、heartbeat age、Wi-Fi / poll backoff、連続失敗時の復帰経路を壊さない。
- 署名付き MSI / MSIX の作業では `installer/wix/`、`installer/msix/`、`tools/windows-signing-check.mjs`、`tools/signed-installer-pipeline.mjs` を同時に確認し、証明書や PFX password は commit しない。
- Codex App 連携を変更する場合は public interface の `codex app-server` adapter と `tools/codex-app-server-runtime-probe.mjs` を優先し、非公開 API scraping を追加しない。既存の session JSONL / hook relay は fallback adapter として残す。
- Dashboard の `/debug/commands/run` から npm script を起動する場合、Windows では `npm.cmd` を直接 `spawn()` せず、`cmd.exe /d /s /c npm ...` 経由にする。この Node/Windows 環境では `spawn('npm.cmd', ...)` が `spawn EINVAL` になる。
- Host Bridge を再起動した直後に実機が `unpaired-device` を増やし続ける場合は、Bridge が旧 `paired-*` token を再取り込みできているかを `/events` の `token-rehydrated` で確認する。これが出ない場合、実機を再起動または firmware を更新して再pairingさせる。
- `dist/validation-result.json` と `docs/platform-runtime-gate.json` には実行時刻、絶対パス、ZIP byte size などの不安定値を入れない。
- token、host IP、個人 pet sprite、会話本文を release asset へ含めない。
- Core2 実機・長時間運用・署名済み installer・実 Codex App Server 接続が未確認のまま公開する場合は prerelease にし、未確認範囲を release notes と `docs/manual-test.md` に明記する。
- 他リポジトリや他ユーザーへ M5Stack 3択 workflow を配布する場合は、`distribution/m5stack-choice-workflow/AGENTS.md` と `distribution/m5stack-choice-workflow/SKILL.md` を更新し、`npm run choice:package` で `dist/m5stack-choice-workflow-kit.zip` を生成する。

## Release Boundary

`v0.2.0-beta.1` は Host Bridge、Dashboard、Codex relay、Codex app-server adapter runtime probe、M5Stack Core2 firmware、pet mood / gesture interaction、Windows user-local installer、署名付き MSI / MSIX pipeline 準備を含む beta prerelease です。GRAY 実機と GRAY IMU は対象外です。stable release ではないため、長時間運用、実署名、ユーザー環境での signed installer 実行確認は手動テストへ残します。複数 M5Stack 同時接続は今回対象外で今後のアップデート対象です。
