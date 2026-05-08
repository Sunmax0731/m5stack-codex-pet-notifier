# 実装計画

## Phase 0: Contract

- JSON Schemaを `schemas/events/*.json` として作成する。
- `samples/*.json` をschemaに合わせて更新する。
- device profileをCore2とGRAYで定義する。

## Phase 1: Host Bridge

- Node.jsまたはPythonでHTTP/WebSocket bridgeを作る。
- pairing code発行、token検証、device registryを実装する。
- mock Codex adapterを実装し、実Codex adapterは後続差し替えにする。

## Phase 2: Simulator

- browserまたはCLI simulatorで画面状態を確認できるようにする。
- sample replay、reply送信、pet interaction送信を実装する。
- `dist/validation-result.json` に代表フロー結果を残す。

## Phase 3: Firmware Scaffold

- PlatformIOまたはArduino IDE向けのM5Unified構成を作る。
- Core2 / GRAYのbuild targetを分ける。
- Wi-Fi設定、host discovery、pairing、heartbeatを実装する。

## Phase 4: UI / Interaction

- pet display、notification、answer scroll、choice replyを実装する。
- Core2 touch / swipeを実装する。
- GRAY button / IMU fallbackを実装する。

## Phase 5: Release Prep

- `docs/manual-test.md` に実機結果を追記する。
- `docs/release-checklist.md` を完了状態へ更新する。
- firmware、host bridge、docs ZIP、sample payloadをrelease assetとして分ける。
