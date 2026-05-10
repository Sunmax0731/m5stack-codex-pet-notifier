# Traceability Matrix

| Requirement | Implementation | Test / Evidence |
| --- | --- | --- |
| Host Bridge pairing token | `src/host-adapter/localLanBridge.mjs` | `happy-path.unauthorizedRejected=1` |
| LAN Host Bridge 起動 | `src/host-bridge/server.mjs` | `npm run bridge:smoke` |
| Dashboard GUI | `src/host-bridge/dashboard/`、`/debug/snapshot`、`/debug/runtime`、`/debug/commands/run`、環境構築コマンド modal 統合送信フォーム、theme / language controls、click help | `npm run dashboard:smoke`、browser screenshot |
| Codex 返答表示 | `src/codex-adapter/relay.mjs`、`/codex/answer`、`answer.completed` | `scripts/codex-relay-smoke.mjs`、`docs/codex-relay-manual-check.md` |
| Codex 最近 session 自動送信 | `src/codex-adapter/sessionWatcher.mjs`、`npm run codex:sessions`、`answer.completed` | `scripts/codex-session-smoke.mjs`、`docs/codex-relay-manual-check.md` |
| Dashboard 最新 Codex 回答表示 | `/codex/session/latest`、`/codex/session/publish`、`src/host-bridge/dashboard/` | `scripts/dashboard-smoke.mjs`、`docs/gui-tools-manual-check.md` |
| Codex decision request | `npm run codex:decision`、`/codex/decision`、Dashboard Decision tab | `scripts/codex-relay-smoke.mjs`、`scripts/dashboard-smoke.mjs`、`docs/formal-release-platform.md` |
| M5Stack Choice Gate 配布 | `distribution/m5stack-choice-workflow/AGENTS.md`、`distribution/m5stack-choice-workflow/SKILL.md`、`docs/m5stack-choice-workflow.md`、`npm run choice:package` | `scripts/validate.mjs`、`dist/m5stack-choice-workflow-kit.zip` |
| Codex Hooks 連携 | `src/codex-adapter/hookRelay.mjs`、`docs/codex-hooks.example.json` | `scripts/codex-session-smoke.mjs`、`docs/codex-relay-manual-check.md` |
| Codex App Server public interface | `src/codex-adapter/appServerAdapter.mjs`、`src/codex-adapter/adapterRegistry.mjs` | `npm run codex:app-server:smoke`、`npm run adapter:review` |
| 日本語返答表示 | `firmware/src/main.cpp` の `fonts::efontJA_12`、UTF-8 code point paging | `scripts/validate.mjs`、`docs/codex-relay-manual-check.md` |
| clipboard 日本語返答表示 | `readClipboard()` の Base64 UTF-8 復元 | `scripts/codex-relay-smoke.mjs`、`docs/codex-relay-manual-check.md` |
| 実機 event polling | `firmware/src/main.cpp` | `docs/hardware-runtime-evidence.json` |
| pet 更新表示 | `pet.updated` schema、`MockM5StackDevice.receive()` | `happy-path.validEvents=5` |
| pet animation | `firmware/src/main.cpp` の `drawPetAvatar`、`DEFAULT_PET_ANIMATION_FPS`、`petAnimationFps`、`M5Canvas petSprite`、`drawPetSurfaceSprite`、`drawPetSurfaceIfNeeded` | `scripts/validate.mjs`、`docs/gui-tools-manual-check.md` |
| pet 表示倍率 / pet X/Y offset / text size / render FPS / motion step / screen・pet・text・border RGBA | `display.settings_updated`、`/codex/display`、M5Stack 表示プレビュー、`firmware/src/main.cpp` の `petDisplayScale` / `petOffsetX` / `petOffsetY` / `petAnimationFps` / `petMotionStepMs` / `parseRgbaString` / `drawTextPanel` | `scripts/dashboard-smoke.mjs`、`scripts/validate.mjs`、`docs/gui-tools-manual-check.md` |
| ダブルクリック起動 | `start-dashboard.bat`、`npm run bridge:start:bg`、`tools/start-bridge-background.mjs` | `scripts/validate.mjs`、`docs/manual-test.md` |
| background bridge 起動 | `tools/start-bridge-background.mjs`、`npm run bridge:start:bg`、`/debug/runtime` | `scripts/dashboard-smoke.mjs`、`docs/gui-tools-manual-check.md` |
| current pet preview | `/pet/current/manifest`、`/pet/current/spritesheet.webp`、Dashboard preview sprite renderer | `scripts/dashboard-smoke.mjs`、browser screenshot |
| hatch-pet asset 表示 | `tools/generate-pet-firmware-asset.py`、`firmware/src/main.cpp` の `pet_asset.local.h` gate、標準 9 行 atlas、row-aware scale-specific frame selection | `scripts/validate.mjs`、Core2 firmware build / upload |
| 通知表示 | `notification.created` schema | `happy-path.finalScreen=Choice` までの遷移 |
| 長文回答スクロール | `src/protocol/scrollModel.mjs` | `mixed-batch.scrollPages=2` |
| 3択返信 | `prompt.choice_requested`、`device.reply_selected` | `happy-path.replyCount=1` |
| Dashboard ABC workflow | `/codex/choice`、Dashboard inbound summary | `scripts/dashboard-smoke.mjs`、`docs/gui-tools-manual-check.md` |
| pet mood / expression | `src/core/pet-mood.mjs`、`pet.updated.pet.mood`、`firmware/src/main.cpp` の hatch-pet row mapping、Dashboard preview row mapping | `scripts/bridge-smoke.mjs`、`scripts/dashboard-smoke.mjs`、`scripts/validate.mjs`、browser smoke |
| pet interaction / gesture | `device.pet_interacted`、Core2 touch gesture、long press side effect | `happy-path.interactionCount=2`、`warning.interactionCount=1`、`npm run bridge:smoke` |
| Windows installer / background launcher | `installer/install-windows.ps1`、`installer/M5StackCodexPetNotifier-Setup.bat`、`start-dashboard.bat`、`tools/start-dashboard-hidden.ps1` | `npm run installer:package`、`scripts/validate.mjs`、`docs/manual-test.md` |
| 署名付き MSI / MSIX 準備 | `installer/wix/Product.wxs`、`installer/msix/Package.appxmanifest`、`tools/windows-signing-check.mjs` | `npm run installer:signing:check` |
| 長時間運用 diagnostics | `src/host-bridge/server.mjs`、`firmware/src/main.cpp` | `scripts/validate.mjs`、`docs/long-run-operations.md` |
| Core2 / button reference profile | `src/device-adapter/deviceProfiles.mjs` | `profileCovered=true` |
| sample telemetry | `samples/sample-telemetry.json` | `docs/platform-runtime-gate.json` |
| security/privacy boundary | checklist、bridge token check | runtime gate `securityPrivacy=true` |
| Core2 touch / swipe | `firmware/src/main.cpp` | `docs/manual-test.md` |
| release readiness | release notes、docs ZIP、manual addendum、redacted evidence | `docs/release-evidence.json` |
