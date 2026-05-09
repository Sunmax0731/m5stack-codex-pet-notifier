# AGENTS

このリポジトリは M5Stack Core2 / GRAY 向け Codex ペット通知端末の Host Bridge、protocol、simulator、firmware scaffold、release docs を扱います。

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
- Dashboard の `/debug/commands/run` から npm script を起動する場合、Windows では `npm.cmd` を直接 `spawn()` せず、`cmd.exe /d /s /c npm ...` 経由にする。この Node/Windows 環境では `spawn('npm.cmd', ...)` が `spawn EINVAL` になる。
- Host Bridge を再起動した直後に実機が `unpaired-device` を増やし続ける場合は、Bridge が旧 `paired-*` token を再取り込みできているかを `/events` の `token-rehydrated` で確認する。これが出ない場合、実機を再起動または firmware を更新して再pairingさせる。
- 同じ `firmware/.pio` を使うため、Core2 / GRAY の PlatformIO build は並列実行せず順番に実行する。
- `dist/validation-result.json` と `docs/platform-runtime-gate.json` には実行時刻、絶対パス、ZIP byte size などの不安定値を入れない。
- token、host IP、個人 pet sprite、会話本文を release asset へ含めない。
- Core2 / GRAY 実機未確認のまま公開する場合は prerelease にし、未確認範囲を release notes と `docs/manual-test.md` に明記する。

## Release Boundary

`v0.2.0-beta.1` は Host Bridge、Dashboard、Codex relay、M5Stack firmware、pet mood / gesture interaction、Windows user-local installer を含む beta prerelease です。stable release ではないため、GRAY 実機、長時間運用、実 Codex App 内部 API 連携、ユーザー環境での installer 実行確認は手動テストへ残します。
