# 実装計画

## Phase 0: Contract

- [x] JSON event schema を `schemas/events/*.json` として作成する。
- [x] sample payload を schema に合わせる。
- [x] Core2 / GRAY device profile を定義する。

## Phase 1: Host Bridge MVP

- [x] pairing code と token 検証を持つ local LAN bridge mock を作る。
- [x] Host -> Device event を validation 後に simulator へ配信する。
- [x] `device.reply_selected`、`device.pet_interacted`、`device.heartbeat` を受信する。
- [ ] 実 Codex App adapter を追加する。

## Phase 2: Simulator

- [x] sample JSON から通知、回答、選択肢、pet 変更を再生する。
- [x] 長文回答のページングと scroll state を検証する。
- [x] reply 送信と pet interaction を host log へ戻す。

## Phase 3: Firmware Scaffold

- [x] PlatformIO / M5Unified 前提の Core2 / GRAY scaffold を作る。
- [x] touch / button の最小表示 loop を置く。
- [ ] 実機 firmware build、flash、Wi-Fi 接続を確認する。

## Phase 4: Release Prep

- [x] README、導入手順、manual test、security/privacy、release checklist を更新する。
- [x] `docs/qcds-strict-metrics.json` と release notes を作る。
- [x] docs ZIP を `npm test` で生成する。
- [ ] GitHub prerelease 作成後、release evidence を実 URL で更新する。
