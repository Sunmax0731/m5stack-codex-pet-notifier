# 実装計画

## Phase 0: Contract

- [x] JSON event schema を `schemas/events/*.json` として作成する。
- [x] sample payload を schema に合わせる。
- [x] Core2 / GRAY device profile を定義する。

## Phase 1: Host Bridge MVP

- [x] pairing code と token 検証を持つ local LAN bridge mock を作る。
- [x] PC 上で起動する LAN Host Bridge server を作る。
- [x] `/pair`、`/device/poll`、`/device/event`、`/codex/event`、`/codex/replay-samples`、`/health`、`/events` を実装する。
- [x] `/codex/answer` と `/codex/notification` を実装する。
- [x] `/codex/choice` と `/codex/pet` を実装し、GUI と CLI から送れるようにする。
- [x] Host Bridge 同梱 Dashboard で状態確認、event 送信、ABC 返信確認、debug command 参照を実装する。
- [x] Host -> Device event を validation 後に simulator へ配信する。
- [x] `device.reply_selected`、`device.pet_interacted`、`device.heartbeat` を受信する。
- [x] clipboard / stdin / file から返答本文を送る Codex relay を追加する。
- [ ] 公開 Codex App adapter API が提供された場合に relay source として追加する。

## Phase 2: Simulator

- [x] sample JSON から通知、回答、選択肢、pet 変更を再生する。
- [x] 長文回答のページングと scroll state を検証する。
- [x] reply 送信と pet interaction を host log へ戻す。

## Phase 3: Firmware

- [x] PlatformIO / M5Unified 前提の Core2 / GRAY target を作る。
- [x] Wi-Fi、pairing、HTTP polling、screen state、reply、pet interaction、heartbeat を実装する。
- [x] Core2 / GRAY の firmware build を確認する。
- [x] Core2 実機 firmware flash、Wi-Fi、pairing、sample event poll を確認する。
- [x] Core2 touch choice、footer touch、answer swipe の firmware 分岐を実装する。
- [x] Core2 / GRAY firmware に pet avatar の blink / bounce / tail animation を実装する。
- [x] hatch-pet package から ignored local firmware asset を生成するツールを追加する。
- [x] firmware が local hatch-pet asset を優先表示し、未生成時は fallback avatar を使うようにする。

## Phase 4: Release Prep

- [x] README、導入手順、manual test、security/privacy、release checklist を更新する。
- [x] hatch-pet asset 生成と privacy 境界を docs に反映する。
- [x] `docs/qcds-strict-metrics.json` と release notes を作る。
- [x] docs ZIP を `npm test` で生成する。
- [ ] GitHub prerelease 作成後、release evidence を実 URL で更新する。
