# AGENTS

このリポジトリは M5Stack Core2 / GRAY 向け Codex ペット通知端末の Host Bridge、protocol、simulator、firmware scaffold、release docs を扱います。

## Scope

- Root: `D:\AI\IoT\m5stack-codex-pet-notifier`
- Source idea: `D:\AI\IoT\created_idea_018_m5stack-codex-pet-notifier`
- Product surface: Host Bridge、JSON event contract、M5Stack device profile、simulator、sample telemetry、firmware scaffold、closed alpha release docs

## Working Rules

- 作業前に `README.md`、`AGENTS.md`、`SKILL.md` を読む。
- Codex App 内部 API へ直接依存せず、Host Bridge adapter の差し替え点に閉じ込める。
- 実機がない場合でも、simulator、mock device、sample telemetry、device / host adapter、security/privacy 境界を `npm test` で確認する。
- PlatformIO を repo root から実行する場合は `pio.exe run -d firmware ...` を使う。`pio.exe -d firmware run ...` はこの環境では失敗する。
- `dist/validation-result.json` と `docs/platform-runtime-gate.json` には実行時刻、絶対パス、ZIP byte size などの不安定値を入れない。
- token、host IP、個人 pet sprite、会話本文を release asset へ含めない。
- Core2 / GRAY 実機未確認のまま公開する場合は prerelease にし、未確認範囲を release notes と `docs/manual-test.md` に明記する。

## Release Boundary

`v0.1.0-alpha.1` は Host Bridge mock、protocol validation、simulator、sample telemetry の closed alpha です。実機 firmware build / flash / Wi-Fi / touch / IMU はユーザー手動テストへ残します。
