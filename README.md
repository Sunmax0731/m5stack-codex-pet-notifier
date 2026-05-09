# m5stack-codex-pet-notifier

M5Stack Core2 / GRAY を Codex App の卓上ペット通知端末として使うための closed alpha prototype です。PC 側の Host Bridge が Codex の状態を LAN 内イベントへ変換し、M5Stack firmware は安定した JSON event contract だけを処理します。

## Status

- Version: `0.1.0-alpha.10`
- Domain: IoT
- Idea No: 18
- Runtime gate: simulator / mock device / sample telemetry / host adapter / LAN Host Bridge / Codex relay / device adapter / security boundary
- Firmware: Core2 / GRAY PlatformIO build target、Core2 upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、Codex relay answer 表示、日本語フォント表示まで確認対象
- Release channel: GitHub prerelease

## 搭載機能

- `schemas/events/*.json` で pet、通知、回答、選択肢、返信、heartbeat のイベント契約を定義する。
- `src/host-bridge/server.mjs` で LAN Host Bridge を起動し、pairing、token 認証、HTTP polling、device event 受信、sample replay、event log、WebSocket upgrade を提供する。Bridge 再起動後に実機が旧 token で poll した場合は、`paired-*` token を再取り込みして既存実機を復帰させる。
- Host Bridge 同梱 Dashboard で環境構築コマンド、状態確認、event log、Answer / Decision / Notification 送信、ABC 返信確認、最近の Codex session 回答の表示と M5Stack 送信を GUI から扱う。環境構築とデバッグ送信はサイドバーのモーダル内タブへ集約し、任意パラメータで実行できる。
- `src/codex-adapter/relay.mjs` で clipboard / stdin / file から Codex 返答本文を取り込み、PowerShell clipboard は Base64 UTF-8 経由で `answer.completed` として M5Stack へ送る。
- `src/codex-adapter/sessionWatcher.mjs` で `%USERPROFILE%\.codex\sessions` の最新 Codex session JSONL を opt-in 監視し、最新の user / assistant のやり取りを M5Stack へ自動送信する。
- `src/codex-adapter/hookRelay.mjs` で Codex Hooks から呼べる one-shot relay を提供し、hook 発火時に最新 session を M5Stack へ送る。
- `codex:decision`、`codex:decision:wait`、Dashboard の Decision tab で、Codex 側から M5Stack へ A/B/C の三択判断を求め、必要に応じて M5Stack の返信を待って Codex 側コマンド結果へ戻す正式リリース向け workflow を提供する。
- `firmware/src/main.cpp` で M5Unified、Wi-Fi、HTTP polling、ArduinoJson による実機 loop を実装する。
- `firmware/src/main.cpp` で M5GFX の日本語フォントと UTF-8 境界の折り返しを使い、日本語の Codex 返答本文を Core2 へ表示する。
- `tools/generate-pet-firmware-asset.py` で `%USERPROFILE%\.codex\pets` の hatch-pet package を firmware 用 RGB565 local asset に変換し、Core2 向けには scale `1..8` ごとの高解像度 frame も生成する。
- `firmware/src/main.cpp` で hatch-pet asset を優先表示し、未生成時は vector fallback を描画する。Core2 は scale ごとの高解像度 frame を選び、GRAY は flash 余裕を優先して vector fallback と large app partition で build gate を通す。state に応じた色、frame animation、bounce を M5Stack 上で表示する。
- pet surface は `M5Canvas` の off-screen Sprite に描画してから `pushSprite()` し、animation tick では画面全体の黒塗りを避けてちらつきを抑える。
- M5Stack 画面上部の `Codex Pet`、`state`、`LAN`、`U:0` などの固定ヘッダーテキストは描画せず、pet surface を優先表示する。
- ペット表示面積は Dashboard または `codex:display` から `1..8` の8段階で動的に変更でき、`8` は pet を画面全体に近い面積で表示する最大設定として扱う。
- UI / body text size も Dashboard または `codex:display` から `1..8` の8段階で動的に変更する。
- pet render FPS は既定 `12fps`、Dashboard または `codex:display` から `4..20fps` の範囲で動的に変更する。キャラの pose / frame 切替は `motionStepMs` で分離し、小刻みな震えを抑える。
- `display.settings_updated` は画面全体の背景、pet 背景、文字色、文字背景、文字枠、pet X/Y offset を受け取り、Codex answer 到着時の beep 通知も切り替えられる。firmware は object / hex string / channel array の RGBA 入力を扱い、local hatch-pet asset の透明ピクセルから設定背景が見えるように描画する。
- Dashboard は side menu、サイドバー内の状態確認 section、折りたたみ可能な section、クリック式 `?` help、OS追従を既定にした light / dark theme、日本語 / 英語 label 切替、全幅のM5Stack 表示プレビュー、環境構築コマンド modal、Bridge runtime status を持ち、送信前に現在の hatch-pet キャラ、pet 面積、pet X/Y offset、文字サイズ、motion step、RGBA、text border、Core2 / GRAY preview の見え方を確認できる。色と透明度は項目ごとの1つの RGBA picker で操作し、現在色の swatch と `#hex / alpha` を同時に表示する。
- Dashboard は `%USERPROFILE%\.codex\pets` 配下の local hatch-pet package を一覧選択でき、必要に応じて package path override で任意の local asset を確認できる。
- Core2 touch / swipe / button と GRAY button / IMU fallback を device profile と firmware 条件分岐で扱う。
- `src/simulator/mockDevice.mjs` で Core2 / GRAY profile の画面遷移、長文回答のページング、返信、pet interaction を再現する。
- `samples/representative-suite.json` で happy path、必須項目欠落、warning、mixed batch を代表シナリオとして検証する。

## Commands

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm test
cmd.exe /d /s /c npm run bridge:smoke
cmd.exe /d /s /c npm run dashboard:smoke
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080
.\start-dashboard.bat
cmd.exe /d /s /c npm run codex:answer -- --text "Codexの返答本文"
cmd.exe /d /s /c npm run codex:choice -- --prompt "進めますか?" --choices yes:進める,no:止める,other:別案
cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"
cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
cmd.exe /d /s /c npm run codex:display -- --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12 --motion-step-ms 280 --screen-bg "#050b14ff" --pet-bg "#050b14ff" --text-color "#ffffffff" --text-bg "#000000b2" --pet-offset-x 0 --pet-offset-y 0 --text-border-enabled false --text-border-color "#ffffffff" --beep-on-answer true
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
cmd.exe /d /s /c npm run codex:sessions -- --phase any
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
cmd.exe /d /s /c npm run firmware:upload:core2
```

`npm test` は `docs/platform-runtime-gate.json`、`dist/validation-result.json`、`docs/qcds-regression-baseline.json`、`dist/m5stack-codex-pet-notifier-docs.zip` を生成または更新します。

Host Bridge 起動後は `http://127.0.0.1:8080/` で Dashboard を開けます。Windows では repo root の `start-dashboard.bat` をダブルクリックすると、background Bridge 起動と Dashboard 表示をまとめて実行できます。

`codex:sessions` はローカルの Codex session log を読む opt-in adapter です。`--phase any` は進行中の最新メッセージも送ります。完了応答だけに絞る場合は `--phase final` を指定します。
Dashboard の `最近の Codex 回答` panel は同じ session log から最新 assistant 回答を表示し、`M5Stackへ送信` で直前 user message と合わせて `answer.completed` として送信します。

Codex Hooks が使える環境では `codex:hook` を hook command として登録します。設定例は [codex-hooks.example.json](docs/codex-hooks.example.json) です。

## Firmware

Codex Pets の素材を使う場合は、firmware build / upload の前に local asset header を生成します。生成先の `firmware/include/pet_asset.local.h` は `.gitignore` 対象で、release asset に含めません。既定では idle row の非空セルから frame 数を自動検出し、scale `1..8` ごとの Core2 用高解像度 frame も同じ header に含めます。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
```

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier\firmware
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-core2
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -e m5stack-gray
cd ..
cmd.exe /d /s /c npm run firmware:upload:core2
```

upload helper は repo root から実行します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run firmware:upload:core2
```

USB serial の COM 番号は Windows の接続状況で変わります。自動検出が外れた場合は次のように明示します。

```powershell
Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name
cmd.exe /d /s /c npm run firmware:upload:core2 -- -UploadPort COM3
```

`D:\AI\secure\ssid.txt` は Git に入れません。M5Stack/ESP32 は 2.4GHz Wi-Fi のみ対応するため、5GHz SSID が記載されている場合は device scan で見つかった対応 2.4GHz SSID を `firmware/include/wifi_config.local.h` に設定します。この local header は `.gitignore` 対象です。

## Documents

- [requirements.md](docs/requirements.md)
- [specification.md](docs/specification.md)
- [architecture.md](docs/architecture.md)
- [test-plan.md](docs/test-plan.md)
- [manual-test.md](docs/manual-test.md)
- [gui-tools-manual-check.md](docs/gui-tools-manual-check.md)
- [host-bridge-manual-check.md](docs/host-bridge-manual-check.md)
- [codex-relay-manual-check.md](docs/codex-relay-manual-check.md)
- [installation-guide.md](docs/installation-guide.md)
- [user-guide.md](docs/user-guide.md)
- [security-privacy-checklist.md](docs/security-privacy-checklist.md)
- [competitive-benchmark.md](docs/competitive-benchmark.md)
- [qcds-evaluation.md](docs/qcds-evaluation.md)
- [formal-release-platform.md](docs/formal-release-platform.md)
- [releases/v0.1.0-alpha.10.md](docs/releases/v0.1.0-alpha.10.md)

## Closed Alpha Boundary

この release は simulator、mock device、LAN Host Bridge smoke、Codex relay smoke、Core2 firmware build / upload / Wi-Fi / pairing / Codex 返答表示を検証対象にした prerelease です。GRAY 実機、長時間運用、実 Codex App 内部 API 連携は対象外です。
