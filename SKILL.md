# SKILL

`m5stack-codex-pet-notifier` の作業手順です。

## Start Order

1. `README.md` を読む。
2. `docs/requirements.md` でMVPと対象外を確認する。
3. `docs/specification.md` でイベント契約と画面仕様を確認する。
4. `docs/design.md` と `docs/architecture.md` でHost Bridge方式とdevice profileを確認する。
5. 実装に入る前に `samples/*.json` を使って期待payloadを確認する。

## Validation

- 実機なし: sample payload replay、schema validation、host bridge mock、simulator確認。
- Core2: touch、スワイプ、A/B/C相当入力、Wi-Fi再接続、画面更新。
- GRAY: A/B/Cボタン、IMU tap代替、ボタン式スクロール、Wi-Fi再接続。
- リリース前: `docs/manual-test.md` と `docs/release-checklist.md` を更新する。

## Prompt Handling

- Codex App連携の未確認部分は推測で実装せず、Host Bridgeのadapter差し替え点として隔離する。
- 長文回答、個人情報、ペット素材の扱いはsecurity/privacy checklistで先に確認する。
