# SKILL

`m5stack-codex-pet-notifier` の作業手順です。

## Start Order

1. `README.md` を読む。
2. `docs/requirements.md`、`docs/specification.md`、`docs/design.md`、`docs/architecture.md` で product boundary を確認する。
3. `samples/representative-suite.json` と `schemas/events/*.json` で event contract を確認する。
4. `src/host-adapter/localLanBridge.mjs`、`src/device-adapter/deviceProfiles.mjs`、`src/simulator/mockDevice.mjs` を確認する。
5. `docs/manual-test.md` と `docs/release-checklist.md` で実機未実施範囲を確認する。

## Validation

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm test
```

- 実機なし: sample payload replay、schema validation、host bridge auth、simulator、sample telemetry、security/privacy boundary。
- Core2 実機: touch、swipe、A/B/C 相当入力、Wi-Fi 再接続、画面更新。
- GRAY 実機と GRAY IMU は release target 外。Dashboard の button reference preview は互換確認用であり、firmware build / flash 対象に戻さない。
- repo root から PlatformIO を実行する場合は `pio.exe run -d firmware ...` の順にする。`pio.exe -d firmware run ...` はこの環境では `No such option: -d` になる。
- 日本語表示を変更した場合は Core2 firmware build と `scripts/validate.mjs` の日本語フォント / UTF-8 境界 gate を通す。
- Codex session 自動送信を変更した場合は `node scripts/codex-session-smoke.mjs` と `cmd.exe /d /s /c npm test` を通し、session 本文を release evidence に保存しない。
- Codex App Server public interface を変更した場合は `cmd.exe /d /s /c npm run codex:app-server:smoke`、`cmd.exe /d /s /c npm run codex:app-server:probe -- --include-turn`、`cmd.exe /d /s /c npm run adapter:review` を通す。
- 署名付き MSI / MSIX の準備を変更した場合は `cmd.exe /d /s /c npm run installer:signing:check` と `cmd.exe /d /s /c npm run installer:signed:pipeline` を通し、証明書 thumbprint / PFX path / PFX password は環境変数だけで扱う。
- formal gate の手動項目を自動化する場合は `cmd.exe /d /s /c npm run formal:automation -- --include-turn` を使い、Core2 実機、Wi-Fi AP、署名証明書など外部前提は結果 JSON の gate として分ける。
- 長時間運用の queue、heartbeat、Wi-Fi / poll backoff を変更した場合は `cmd.exe /d /s /c npm test` に加えて Core2 firmware build を実行する。
- M5Stack Choice Gate の配布ルールを変更した場合は `distribution/m5stack-choice-workflow/AGENTS.md`、`distribution/m5stack-choice-workflow/SKILL.md`、`docs/m5stack-choice-workflow.md` を同時に更新し、`cmd.exe /d /s /c npm run choice:package` を実行する。
- hatch-pet の素材を firmware に反映する場合は、先に `cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h` を実行する。生成される `pet_asset.local.h` は ignored local file であり commit しない。
- Dashboard の command modal 経由で npm script を実行する実装を変更した場合は、Windows の `spawn('npm.cmd', ...)` を避け、`cmd.exe /d /s /c npm ...` 経由にする。GUIで `spawn EINVAL` が出た場合はこの経路を最初に確認する。
- PlatformIO build は Core2 target のみを対象にし、repo root からは `E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2` を使う。
- PowerShell では `&&` を前提にせず、`git add` と `git commit` などの段階コマンドは個別に実行する。

## Release

- beta release notes は `docs/releases/v0.2.0-beta.1.md` を本文に使う。
- release asset は `dist/m5stack-codex-pet-notifier-docs.zip`、`dist/m5stack-codex-pet-notifier-v0.2.0-beta.1-windows-installer.zip`、`docs/manual-test.md`、`docs/strict-manual-test-addendum.md` を必須にする。
- M5Stack Choice Gate の配布を含む release では `dist/m5stack-choice-workflow-kit.zip` も asset に含める。
- release 作成後に `docs/release-evidence.json` を更新し、`npm test` を再実行して docs ZIP を再生成してから asset を再アップロードする。
