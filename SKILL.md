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
- GRAY 実機: A/B/C ボタン、IMU tap 代替、ボタン式スクロール、Wi-Fi 再接続。
- repo root から PlatformIO を実行する場合は `pio.exe run -d firmware ...` の順にする。`pio.exe -d firmware run ...` はこの環境では `No such option: -d` になる。
- 日本語表示を変更した場合は Core2 / GRAY 両方の firmware build と `scripts/validate.mjs` の日本語フォント / UTF-8 境界 gate を通す。
- hatch-pet の素材を firmware に反映する場合は、先に `cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h` を実行する。生成される `pet_asset.local.h` は ignored local file であり commit しない。
- PlatformIO build は `.pio` の cleanup が競合しないように Core2、GRAY の順に個別実行する。

## Release

- release notes は `docs/releases/v0.1.0-alpha.1.md` を本文に使う。
- release asset は `dist/m5stack-codex-pet-notifier-docs.zip`、`docs/manual-test.md`、`docs/strict-manual-test-addendum.md` を必須にする。
- release 作成後に `docs/release-evidence.json` を更新し、`npm test` を再実行して docs ZIP を再生成してから asset を再アップロードする。
