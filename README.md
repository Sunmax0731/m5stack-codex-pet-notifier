# m5stack-codex-pet-notifier

M5Stack Core2 / GRAYを、Codex Appの卓上ペット通知端末として使うための実装前成果物です。Codex Appが動作するPC上にHost Bridgeを置き、同一Wi-Fi上のM5Stackへペット状態、通知、回答、選択肢を配信します。

## Status

- Phase: planning / pre-release documents ready
- Domain: IoT
- Idea No: 18
- Target devices: M5Stack Core2, M5Stack GRAY
- Public target: GitHub Release / 自宅LAN
- Manual testing: not run

## MVP

- Host BridgeからM5Stackへ通知、回答、選択肢、ペット変更を送る。
- M5StackのA/B/CボタンでYes/No/Otherまたは3択返信を返す。
- Core2では画面タップ、GRAYではボタン長押しまたはIMUタップ代替でペットを反応させる。
- Codex Appでペット変更があったらM5Stack表示も追従する。
- 長文回答をスクロール表示する。

## Documents

- [requirements.md](docs/requirements.md)
- [specification.md](docs/specification.md)
- [design.md](docs/design.md)
- [architecture.md](docs/architecture.md)
- [implementation-plan.md](docs/implementation-plan.md)
- [test-plan.md](docs/test-plan.md)
- [manual-test.md](docs/manual-test.md)
- [release-checklist.md](docs/release-checklist.md)
- [pre-release-readiness.md](docs/pre-release-readiness.md)

## Samples

- [notification-event.json](samples/notification-event.json)
- [pet-update-event.json](samples/pet-update-event.json)
- [answer-completed-event.json](samples/answer-completed-event.json)
- [choice-request-event.json](samples/choice-request-event.json)
- [reply-selected-event.json](samples/reply-selected-event.json)
