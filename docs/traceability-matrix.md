# Traceability Matrix

| Requirement | Implementation | Test / Evidence |
| --- | --- | --- |
| Host Bridge pairing token | `src/host-adapter/localLanBridge.mjs` | `happy-path.unauthorizedRejected=1` |
| LAN Host Bridge 起動 | `src/host-bridge/server.mjs` | `npm run bridge:smoke` |
| 実機 event polling | `firmware/src/main.cpp` | `docs/hardware-runtime-evidence.json` |
| pet 更新表示 | `pet.updated` schema、`MockM5StackDevice.receive()` | `happy-path.validEvents=4` |
| 通知表示 | `notification.created` schema | `happy-path.finalScreen=Choice` までの遷移 |
| 長文回答スクロール | `src/protocol/scrollModel.mjs` | `mixed-batch.scrollPages=2` |
| 3択返信 | `prompt.choice_requested`、`device.reply_selected` | `happy-path.replyCount=1` |
| pet interaction | `device.pet_interacted` | `happy-path.interactionCount=1`、`warning.interactionCount=1` |
| Core2 / GRAY profile | `src/device-adapter/deviceProfiles.mjs` | `profileCovered=true` |
| sample telemetry | `samples/sample-telemetry.json` | `docs/platform-runtime-gate.json` |
| security/privacy boundary | checklist、bridge token check | runtime gate `securityPrivacy=true` |
| release readiness | release notes、docs ZIP、manual addendum、firmware binary | `docs/release-evidence.json` |
