# 仕様

## コンポーネント

| Component | Responsibility | 実装 |
| --- | --- | --- |
| Host Bridge model | Codex App 側の状態を正規イベントへ変換し LAN 内 device へ配信する contract を検証する | `src/host-adapter/localLanBridge.mjs` |
| LAN Host Bridge | pairing、token 認証、HTTP polling、device event 受信、sample replay、event log を提供する | `src/host-bridge/server.mjs` |
| Dashboard GUI | Host Bridge のsidebar状態確認、debug snapshot、event 送信、ABC 返信確認、最近の Codex session 回答表示、Core2 / button reference preview、表示設定、導入コマンド参照を提供する | `src/host-bridge/dashboard/` |
| Codex relay | clipboard / stdin / file の Codex 返答を `answer.completed` へ変換して Host Bridge に送る。PowerShell clipboard は Base64 UTF-8 経由で読む | `src/codex-adapter/relay.mjs` |
| Codex session watcher | `%USERPROFILE%\.codex\sessions` の最新 session JSONL から user / assistant の最新やり取りを抽出し、`answer.completed` として送る | `src/codex-adapter/sessionWatcher.mjs` |
| Codex hook relay | Codex Hooks の command hook から one-shot で session watcher を実行し、重複送信を state file で抑止する | `src/codex-adapter/hookRelay.mjs` |
| Codex app-server adapter | Codex App Server public interface の JSON-RPC message builder、transport safety gate、timeout 付き stdio session、runtime probe を提供する | `src/codex-adapter/appServerAdapter.mjs`、`tools/codex-app-server-runtime-probe.mjs` |
| Adapter review | 実 adapter の fallback / public API / private scraping 禁止をまとめて検証する | `src/codex-adapter/adapterRegistry.mjs`、`tools/adapter-review.mjs` |
| Device Profile | Core2 release profile と button reference preview の入力差分を吸収する | `src/device-adapter/deviceProfiles.mjs` |
| Simulator | 実機なしで通知、回答、選択肢、pet 更新を再生する | `src/simulator/mockDevice.mjs` |
| Protocol | Event schema、validation、warning を管理する | `schemas/events/*.json`、`src/protocol/validator.mjs` |
| Pet asset generator | hatch-pet package の `spritesheet.webp` を firmware 用 RGB565 local header へ変換する | `tools/generate-pet-firmware-asset.py` |
| Firmware | M5Unified、Wi-Fi、HTTP polling、ArduinoJson、日本語フォント表示による device loop | `firmware/` |
| Signing readiness / pipeline | WiX MSI / MSIX template と Windows SDK / WiX / 署名用 env を確認し、WiX source / MSIX payload、release 環境では署名と verify まで進める | `installer/`、`tools/windows-signing-check.mjs`、`tools/signed-installer-pipeline.mjs` |

## LAN Host Bridge API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/pair` | `deviceId` と `pairingCode` から device token を発行する |
| `GET` | `/device/poll?deviceId&token` | paired device が Host -> Device event を 1 件取得する |
| `POST` | `/device/event?deviceId&token` | device から reply / interaction / heartbeat を送る |
| `POST` | `/codex/event` | Codex adapter 相当の Host -> Device event を queue する |
| `POST` | `/codex/answer` | 返答本文から `answer.completed` を生成して queue する |
| `POST` | `/codex/notification` | 通知本文から `notification.created` を生成して queue する |
| `POST` | `/codex/choice` | 確認依頼から `prompt.choice_requested` を生成して queue する |
| `POST` | `/codex/decision` | 正式リリース向けに Codex から M5Stack へ三択判断依頼を生成して queue する |
| `POST` | `/codex/pet` | pet name / state / spriteRef から `pet.updated` を生成して queue する |
| `POST` | `/codex/display` | pet 表示倍率、text size、render FPS、motion step、screen / pet / text / border RGBA、pet X/Y offset、beep から `display.settings_updated` を生成して queue する |
| `GET` | `/pet/packages` | `%USERPROFILE%\.codex\pets` 配下の local hatch-pet package metadata を Dashboard preview 用に返す |
| `GET` | `/pet/current/manifest` | Dashboard preview 用に現在の local hatch-pet package の公開可能 metadata を返す |
| `GET` | `/pet/current/spritesheet.webp` | Dashboard preview 用に現在の local hatch-pet spritesheet を返す。release asset には含めない |
| `GET` | `/codex/session/latest` | local Codex session JSONL から最新 assistant 回答を Dashboard 表示用に返す |
| `POST` | `/codex/session/publish` | 最新 Codex session の user / assistant やり取りを `answer.completed` として queue する |
| `POST` | `/codex/replay-samples` | sample event 一式を queue する |
| `GET` | `/events` | outbound / inbound / security log を redaction 前提で確認する |
| `GET` | `/health` | version、paired device、event count を確認する |
| `GET` | `/debug/snapshot` | Dashboard と手動確認用に health、redacted events、debug command を返す |
| `GET` | `/debug/runtime` | Dashboard sidebar 用に Bridge の pid、uptime、foreground / background 状態を返す |
| `GET` | `/debug/commands` | Dashboard command modal 用に allowlist 済み command 定義、tab、parameter schema を返す |
| `POST` | `/debug/commands/run` | localhost からの allowlist command 実行だけを受け付け、stdout / stderr / result を返す |
| `GET` | `/`、`/dashboard/*` | Host Bridge Dashboard を返す |

## Event Schema

| Event | Direction | Required Fields |
| --- | --- | --- |
| `pet.updated` | Host -> Device | `eventId`, `pet.id`, `pet.name`, `pet.state`, `pet.mood`, `pet.spriteRef` |
| `notification.created` | Host -> Device | `eventId`, `title`, `body`, `severity`, `createdAt` |
| `answer.completed` | Host -> Device | `eventId`, `threadId`, `summary`, `body`, `createdAt` |
| `prompt.choice_requested` | Host -> Device | `eventId`, `threadId`, `prompt`, `choices[]`, `timeoutSec` |
| `display.settings_updated` | Host -> Device | `eventId`, `display.petScale`, `display.uiTextScale`, `display.bodyTextScale`, `display.animationFps`, `display.motionStepMs`, `display.screenBackgroundRgba`, `display.petBackgroundRgba`, `display.textColorRgba`, `display.textBackgroundRgba`, `display.petOffsetX`, `display.petOffsetY`, `display.textBorderEnabled`, `display.textBorderRgba`, `display.beepOnAnswer`, `display.visualProbe` |
| `device.reply_selected` | Device -> Host | `eventId`, `requestEventId`, `choiceId`, `deviceId` |
| `device.pet_interacted` | Device -> Host | `eventId`, `petId`, `interaction`, `gesture`, `target`, `screen`, `page`, `mood`, `deviceId` |
| `device.heartbeat` | Device -> Host | `eventId`, `deviceId`, `battery`, `wifiRssi`, `screen`、任意の `lastError`、`errorRecoverable`、`display.petScale`、`display.petOffsetX/Y`、`display.*Rgba`、`display.beepOnAnswer`、`display.visualProbe`、`display.applyCount`、`display.lastEventId`、`pet.mood`、`pet.lastInteraction`、`pet.interactionCount` |

## 画面状態

| State | Trigger | 表示 |
| --- | --- | --- |
| Pairing | 初回起動、token 失効 | host IP、pairing code、接続状態 |
| Idle | 通常時、`pet.updated` | pet、接続状態、未読件数、最終通知 |
| Notification | `notification.created` | タイトル、本文、重要度 |
| Answer | `answer.completed` | 要約、本文、ページ位置 |
| Choice | `prompt.choice_requested` | prompt、A/B/C 選択肢、timeout |
| Error | 通信断、認証失敗、payload 不正 | 原因、再試行状態 |

## 入力割り当て

| Operation | Core2 release profile | Button reference preview |
| --- | --- | --- |
| 選択 A/B/C | 下部 touch button または画面領域 | A/B/C 相当の preview 入力 |
| pet 反応 | pet 領域 single tap / double tap / long press / swipe | click / double click / long press |
| 回答スクロール | swipe up/down/left/right | 上下 button 相当 |
| 戻る | 画面左上 tap または B 長押し | B 長押し相当 |

GRAY 実機と GRAY IMU は release target 外です。`gray` profile id は Dashboard preview と古い scenario 互換のために残しますが、`releaseTarget=false` とし firmware build target には戻しません。

## Codex Relay

| Source | Command | Purpose |
| --- | --- | --- |
| stdin / argument | `npm run codex:answer -- --text "..."` | Codex 返答本文を直接送る |
| clipboard | `npm run codex:clipboard -- --summary "..."` | Codex App から copy した返答を送る |
| file | `npm run codex:watch -- --file dist/codex-answer.txt` | 外部ツールが書いた返答ファイルを監視する |
| session JSONL | `npm run codex:sessions -- --phase any` | 最近の Codex session の最新 user / assistant やり取りを自動送信する |
| Codex Hooks | `npm run codex:hook -- --bridge http://127.0.0.1:8080` | Codex hook 発火時に最新 session を1回だけ送る |
| Codex App Server | `npm run codex:app-server:smoke`、`npm run codex:app-server:probe -- --include-turn` | public interface adapter の message contract、transport gate、実 `codex app-server` の thread / turn 作成を検証する |
| Decision | `npm run codex:decision -- --question "..." --a "..." --b "..." --c "..."` | Codex 側から M5Stack へ三択判断を求める |

`codex:sessions` は opt-in のローカルファイル監視です。Codex App の非公開 API へ接続せず、ローカル session JSONL だけを読みます。`--phase any` は進行中の commentary も送信し、`--phase final` は完了応答だけを送信します。
`codex:hook` は hook process ごとに起動されるため、`dist/codex-session-hook-state.json` に本文を含まない署名だけを保存して重複送信を防ぎます。
`codex-app-server` adapter は `initialize`、`thread/start`、`turn/start` を組み立て、stdio を既定 transport とします。runtime probe は schema 生成と実 process での thread / turn 作成を確認し、本文は evidence に保存しません。WebSocket は loopback 以外で auth を必須にし、非公開 API scraping は `privateApiScraping=false` の review gate で禁止します。

## 日本語表示

- firmware は M5GFX の `fonts::efontJA_12` を使用し、日本語を含む UTF-8 文字列を表示する。
- Answer 本文のページングと折り返しは UTF-8 code point 境界で行い、日本語の途中バイトで `substring` しない。
- 画面幅を超える行はピクセル幅で折り返し、最終行のみ `...` で省略する。
- Windows PowerShell から clipboard を読む場合は、PowerShell 側で UTF-8 bytes を Base64 化し、Node.js 側で復元する。

## Dashboard GUI

- Host Bridge と同一 process で static HTML / CSS / JS を配信する。
- Dashboard は `/health`、`/events`、`/debug/snapshot` を polling し、paired device、outbound、inbound、security rejection を表示する。
- Answer / Decision / Notification はそれぞれ `/codex/answer`、`/codex/decision`、`/codex/notification` を使う。互換用に `/codex/choice` も残す。
- Answer / Decision / Notification は環境構築コマンド modal の `デバッグ送信` tab のallowlist commandとして扱い、重複した直接送信フォーム、独立した送信 section、Debug section は持たない。
- Pet と Display は `M5Stack 表示プレビュー` へ統合し、`/codex/pet` と `/codex/display` から pet 表示倍率、pet X/Y offset、UI text size、body text size、pet render FPS、motion step、screen / pet / text / border RGBA、answer beep を M5Stack へ送る。
- 古い Host Bridge process が残って `/codex/display` が 404 になる場合、Dashboard は `/codex/event` 経由の `pet.updated` fallback に display 設定を同梱して送る。
- `最近の Codex 回答` panel は `/codex/session/latest` で最新 assistant 回答を表示し、`/codex/session/publish` で M5Stack へ送信する。
- 環境構築と debug command は side menu の button から modal で表示し、`環境構築`、`デバッグ送信` の tab から allowlist 済み command を任意パラメータで実行できる。`環境構築` tab には Bridge background 起動と Bridge 再起動を含める。sample replay は重複した保守tabではなくデバッグ送信tabへ統合する。command 実行は localhost からの `/debug/commands/run` に限定する。
- Decision 返信ワークフローと送信結果は環境構築コマンド modal に統合し、Decision 送信後に M5Stack 側の A/B/C 操作で `device.reply_selected` が inbound に入ることを Dashboard 上で確認する。
- 各 section は View / Hide で折りたたみできる。主要 field は `?` help icon のクリックで hint を表示する。
- `/events` は reply の `choiceId`、`requestEventId`、input、heartbeat summary などの運用確認に必要な最小情報だけを返し、回答本文を永続 evidence に残さない。

## Pet Animation

- firmware は header に pet avatar を描画する。
- M5Stack の固定ヘッダー文言（`Codex Pet`、`state`、`LAN`、`U:0` など）は描画しない。
- `display.settings_updated.display.petScale` は `1..32` を受け付け、`8` を画面全体に近い表示、`32` を現在の最大表示からさらに4倍の超拡大表示とする。
- `display.settings_updated.display.uiTextScale` と `bodyTextScale` は `1..8` を受け付け、footer と本文の text size を個別に変更できる。
- `display.settings_updated.display.animationFps` は `4..20` を受け付け、既定 `12fps` で pet surface redraw の上限を決める。
- `display.settings_updated.display.motionStepMs` は `120..800` を受け付け、既定 `280ms` でキャラの pose / frame 切替間隔を決める。
- `display.settings_updated.display.screenBackgroundRgba` は LCD 画面全体の背景に反映する。
- `display.settings_updated.display.*Rgba` は `r/g/b/a=0..255` を受け付け、pet 背景、本文文字、本文背景、文字枠に反映する。
- Dashboard の色設定は各項目1つの RGBA picker で操作し、現在色の swatch と `#hex / alpha` の数値表示を同じ section 内に維持する。
- `display.settings_updated.display.petOffsetX` と `petOffsetY` はそれぞれ `-1280..1280`、`-960..960` を受け付け、pet を画面外にはみ出す位置まで動かせる。
- `display.settings_updated.display.textBorderEnabled` は boolean を受け付け、文字パネルと footer の枠線を切り替える。
- `display.settings_updated.display.beepOnAnswer` は boolean を受け付け、次回 `answer.completed` 到着時の短い beep を切り替える。
- `pet.updated.pet.mood` は `idle / listening / thinking / happy / surprised / confused / sleepy / worried / alert / proud` を受け付け、`state` と独立して pet の表情または姿勢に反映する。local hatch-pet asset がある場合は標準 atlas row を選択し、図形 marker は重ねない。未指定時は `state` から安全な fallback mood を導出する。
- `device.pet_interacted.interaction` は `tap / double-tap / long-press / button-long-press / swipe-up / swipe-down / swipe-left / swipe-right` を扱う。`gesture`、`target`、`screen`、`page`、`mood` は Dashboard 診断と Codex workflow の context として保持する。
- Host Bridge は `long-press` または `button-long-press` を受け取った場合、同じ device に `prompt.choice_requested` を queue し、M5Stack から Codex 側の次アクションを A/B/C で返せるようにする。
- Dashboard は side menu、環境構築コマンド modal、M5Stack 表示プレビューを持ち、送信前に現在の hatch-pet spritesheet、pet 面積、pet X/Y offset、text size、render FPS、motion step、RGBA、text border、Core2 / button reference 表示を確認できる。表示パラメータは `変更を自動送信` がonならデバウンス付きで実機へ送信し、offなら `表示設定を送信` button で手動送信する。プレビューは1ペインで全幅表示し、最近の Codex 回答とイベントログは左右ペインで維持する。各項目の説明は `?` icon click で開く help popover とし、theme は既定で OS に追従しつつ light / dark を手動選択できる。label は既定日本語で、English へ切り替えできる。
- firmware は互換 fallback として `pet.updated.display` も同じ display 設定として解釈する。
- firmware は `display.*Rgba` を object、hex string、channel array として受け取り、LCD 全体は screen background、local hatch-pet asset の透明ピクセル部分は pet background、文字パネルと footer は text background と text border を使って描画する。text background は screen background に暗黙同期せず、alpha `0` ではパネル塗りを行わず文字だけを描画する。pet fullscreen layout の Answer / Decision / Notification でも本文パネルを描画して、text panel の塗りを screen background へfallbackしない。
- firmware は pet avatar を `M5Canvas` の off-screen Sprite に描画し、pet box だけを `pushSprite()` で転送する。pet animation tick では `needsPetRedraw` だけを立て、画面全体や本文を再描画しない。
- `firmware/include/pet_asset.local.h` がある場合、hatch-pet package から生成した RGB565 frame を優先表示する。header は `PET_ASSET_HAS_ANIMATION_ROWS`、row frame count、row offset を持ち、`idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review` を行別に参照できる。
- 生成 header は base frame に加え、scale `1..8` ごとの Core2 用高解像度 frame set を含む。firmware は `petDisplayScale` と現在の row に対応する frame set を選び、低解像度 base frame の矩形拡大だけに依存しない。flash 制約のため高解像度 set は idle の全 frame と各 row の代表 pose を保持する。
- `firmware/include/pet_asset.local.h` がない場合、同じ firmware source は vector fallback avatar を描画する。
- local asset header は `.gitignore` 対象で、個人 pet sprite を release asset や docs ZIP に含めない。
- `pet.updated.pet.state` は `idle`、`waiting`、`running`、`failed`、`review`、`reacting`、`celebrate` と mood 互換値を受け付ける。
- avatar は `max(animationFps 由来 interval, motionStepMs)` ごとに frame / bounce を更新する。fallback avatar では blink / tail も更新する。
- `review`、`reacting`、`celebrate` は mood fallback を通じて row を変え、pet interaction 時は短時間 `waving`、`jumping`、`review`、左右 running などの row として表示する。local asset がない場合は従来の fallback avatar 表情で近似する。

## 保存方針

- device 保存: `deviceId`、host URL、pairing token、表示設定。
- device 非保存: 通知本文、回答本文、返信本文、個人 pet sprite。
- host 保存: beta では event type、eventId、device event summary、display / pet diagnostics、adapter review result、signing readiness result、signed installer pipeline result、Codex App Server runtime probe result のみを release evidence に残す。Codex App Server probe では回答本文や prompt 本文を保存しない。
