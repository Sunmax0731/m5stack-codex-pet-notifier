# GUI ツール手動確認手順

この手順は Host Bridge 同梱ダッシュボード、Codex-M5Stack 通信、ペット描画、Decision 返信ワークフローを実機で確認するためのものです。

## 前提

- Core2 に最新 firmware を upload 済みである。
- PC と Core2 が同一 2.4GHz LAN に接続されている。
- `firmware/include/wifi_config.local.h` の SSID、password、Host Bridge host は Git に含めない。
- `%USERPROFILE%\.codex\pets\Mira` などの hatch-pet package から `firmware/include/pet_asset.local.h` を生成してから build / upload する。
- 8080 番に古い Host Bridge が残っている場合は、その PowerShell を閉じてから起動する。閉じられない場合は、確認用に別 port を使う。

Pet asset 生成:

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h
cmd.exe /d /s /c npm run firmware:upload:core2
```

## 1. Host Bridge と Dashboard を起動する

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
```

ダブルクリックで起動する場合は repo root の `start-dashboard.bat` を実行します。

ブラウザで次を開きます。

```text
http://127.0.0.1:8080/
```

期待結果:

- `M5Stack Codex Pet Console` が表示される。
- 状態確認に paired、outbound、inbound、security の数値が表示される。
- `debug JSON` を開くと `/debug/snapshot` の JSON が表示される。
- `最近の Codex 回答` panel が表示され、`読込` と `M5Stackへ送信` button がある。
- side menu があり、状態、プレビュー、最近の回答、ログへ移動できる。`状態` は必ず表示され、独立した `送信` menu と `デバッグ` menu は表示されない。
- Answer / Decision / Notify の送信、sample replay、各種 debug command は `環境構築コマンド` modal に集約されている。
- `M5Stack 表示プレビュー` に Pet 設定、pet display area、UI text size、body text size、render FPS、motion step が統合されている。
- `M5Stack 表示プレビュー` があり、現在の hatch-pet キャラで Pet / Answer / Decision / Notify の simulated display を送信前に確認できる。
- `M5Stack 表示プレビュー` で Core2 / GRAY、local hatch-pet asset、screen background RGBA、pet background RGBA、text color RGBA、text background RGBA、text border RGBA、pet X/Y offset、Codex answer beep を変更できる。
- `M5Stack 表示プレビュー` は1ペインで全幅表示され、画面プレビュー、readout、asset、表示設定が同じ section 内で見通せる。
- 最近の Codex 回答とイベントログは左右ペインで並ぶ。
- sidebar に Bridge runtime status があり、foreground / background、pid、uptime が見える。
- 主要項目の `?` icon を click すると tooltip hint が表示される。
- topbar に `言語` と `テーマ` があり、既定は日本語、テーマはOSに追従する。手動でEnglish / light / darkへ切り替えできる。
- 各 section の `Hide` / `View` で折りたたみできる。
- sidebar の `環境構築コマンド` から setup / debug command modal を開ける。
- command modal は `環境構築`、`デバッグ送信`、`保守` のタブを持つ。
- command modal で pet asset 生成、Core2 upload、Codex answer、ABC Decision、Display settings、Codex session、sample replay を任意パラメータで実行できる。実行結果は modal 下部の output に表示される。
- command modal の実行 button は各 card 下部に一定高さで表示され、入力欄の量によって極端に縦長にならない。
- `/health` の `version` が `0.1.0-alpha.10` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が 8080 番に残っているため、その PowerShell を閉じてから再起動する。8080を閉じられない場合は `bridge:start:bg -- --port=18081` で最新Bridgeを起動し、Dashboardが最新Bridge APIを自動検出していることを確認する。

## 2. M5Stack の pairing と状態確認

Core2 を起動し、Wi-Fi 接続と pairing を待ちます。

期待結果:

- Core2 は固定ヘッダーテキストを表示せず、pet surface が表示され、数秒ごとに blink / bounce / tail が変化する。
- Dashboard の paired が `1` 以上になる。
- `deviceId` が `m5stack-sample-001` のまま送信対象として使える。

## 3. Codex Answer 表示

Dashboard の `Answer` tab で summary と body を入力し、`Answer を送信` を押します。

期待結果:

- Dashboard の send result が `ok=true`。
- outbound に `answer.completed` が出る。
- Core2 が `Answer page 1/1` または複数 page の Answer 画面へ遷移する。
- 日本語本文が文字化けしない。

## 4. Pet 更新と hatch-pet アニメーション

Dashboard の `M5Stack 表示プレビュー` で state を `celebrate` または `reacting` にして `Pet 更新を送信` を押します。

期待結果:

- outbound に `pet.updated` が出る。
- Core2 の pet surface が `Mira` などの hatch-pet asset として表示される。
- Core2 の pet surface の背景色または表示状態が変わる。
- avatar が静止画ではなく、frame / bounce の周期変化を続ける。
- pet surface は `M5Canvas` Sprite buffer 経由で更新され、pet に重なった本文、Decision label、footer は animation tick ごとにちらつかない。
- `firmware/include/pet_asset.local.h` を削除して build した fallback vector だけの見た目ではない。
- Display 設定を `1/8`、`4/8`、`8/8` に変えたとき、Core2 は scale ごとの高解像度 frame を選び、同じ低解像度 frame をブロック状に拡大した見た目にならない。

## 4.1 Display 設定とプレビュー

Dashboard の `M5Stack 表示プレビュー` を開き、次を送信します。

- `pet display area`: `8/8`
- `UI text size`: `2/8`
- `body text size`: `2/8`
- `render FPS`: `12fps`
- `motion step`: `280ms`
- `screen background`: 任意の色 / alpha
- `pet background`: 任意の色 / alpha
- `text color`: 任意の色 / alpha
- `text background`: 任意の色 / alpha
- `pet X offset`: `-80px` と `80px`
- `pet Y offset`: `-80px` と `80px`
- `text border`: 任意の色 / alpha
- `テキスト枠を表示`: on / off
- `Codex回答のビープ通知`: on

期待結果:

- Dashboard の send result が `ok=true`。
- outbound に `display.settings_updated` が出る。
- 古い Host Bridge process が残っている場合は fallback として `pet.updated` が出る。この場合も Core2 の display 設定が変われば合格とする。
- Core2 は `Codex Pet`、`state`、`LAN`、`U:0` などの固定ヘッダーテキストを表示しない。
- `petScale=8` では pet が画面全体に近い最大面積で表示される。
- `screen background` を変えると、pet 背景以外の画面全体の背景色が変わる。
- local hatch-pet asset の透明ピクセル部分に pet background RGBA が見え、以前の固定アクセント色カードに見えない。
- `pet X/Y offset` を変えると pet が上下左右に移動し、値によっては画面外にはみ出す。
- `text background` を変えると Answer / Decision / Notification の本文パネルと footer の全ての文字背景に反映され、黒のまま残る領域がない。
- `テキスト枠を表示` を on にすると本文パネルと footer に枠線が出る。off にすると消える。`text border` の色 / alpha も反映される。
- Dashboard preview の footer label は `A poll` が左、`B pet` が中央、`C idle` が右に揃い、実機の表示位置と一致する。
- Core2 では `petScale` に対応する scale-specific frame が描画され、低解像度 base frame の単純拡大より輪郭と模様が読みやすい。
- `UI text size` を変更すると footer の文字サイズが変わる。
- `body text size` を変更すると Answer / Notification の本文サイズが変わり、1ページに入る文字量が変わる。
- `render FPS` を `4`、`12`、`20`、`motion step` を `120`、`280`、`600` に変えると、描画更新上限と pet frame / bounce の切替頻度が分離して変わる。
- `20fps` にしても画面全体の黒塗りや footer / body text の明滅は起きず、pet surface と text overlay が安定して見える。
- Dashboard の M5Stack 表示プレビューも slider、FPS、RGBA、Core2 / GRAY、local hatch-pet asset 変更を即時反映する。
- 次回 `answer.completed` 到着時に短い beep が鳴る。`Codex回答のビープ通知` を off にして再送すると鳴らない。

## 4.2 Command modal と background bridge

Dashboard の sidebar で `環境構築コマンド` を押します。

期待結果:

- modal 上部に `環境構築`、`デバッグ送信`、`保守` のタブが表示される。
- `環境構築` tab で `petDir` と `output` を変えて pet asset 生成を実行できる。
- `環境構築` tab で `uploadPort` を空欄または `COM3` などにして Core2 upload を実行できる。
- `デバッグ送信` tab で Answer、Decision、Display settings の値を変更し、button 実行で outbound に反映できる。
- `保守` tab で sample replay を実行できる。
- modal の output に command、code、stdout / stderr または replay result が表示される。
- localhost 以外から `/debug/commands/run` を呼んだ場合は `local-command-execution-only` で拒否される。
- `cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080` で起動した場合、PowerShell 画面を残さず、sidebar runtime status が `background` と pid を表示する。
- `start-dashboard.bat` をダブルクリックした場合、同じ background 起動が行われ、既定ブラウザで `http://127.0.0.1:8080/` が開く。

## 5. Codex session 自動送信

別 PowerShell で最新 session を1回送信します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:sessions -- --once --phase any
```

期待結果:

- outbound に `answer.completed` が出る。
- Core2 が `Answer` 画面へ遷移する。
- 最近の Codex session の最新 user / assistant やり取りが `User:`、`Codex:` 付きで表示される。
- session JSONL の実本文は release evidence に保存しない。

Dashboard から確認する場合:

1. `最近の Codex 回答` panel の `読込` を押す。
2. `latest answer` に最新 assistant 回答が表示されることを確認する。
3. 必要に応じて `直前の user message` を開き、対応する直前 user message が表示されることを確認する。
4. `M5Stackへ送信` を押す。

期待結果:

- Dashboard の send result が `ok=true`。
- outbound に `answer.completed` が出る。
- Core2 が `Answer` 画面へ遷移し、直前 user message と最新 assistant 回答が `User:`、`Codex:` 付きで表示される。
- Dashboard 表示と M5Stack 表示の本文が一致する。

Hook 経由相当の one-shot relay を確認する場合:

```powershell
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
```

期待結果:

- 未送信の最新 session がある場合、outbound に `answer.completed` が出る。
- 直前と同じ message の場合は重複抑止される。

## 6. Decision 返信ワークフロー

Dashboard の `Decision` tab で prompt と A/B/C label を入力し、`Decision を送信` を押します。

期待結果:

- outbound に `prompt.choice_requested` が出る。
- Core2 が Choice 画面へ遷移し、A/B/C の label が表示される。
- Core2 の A/B/C のいずれかを押すと、Dashboard の inbound に `device.reply_selected` が出る。
- `環境構築コマンド` modal の `Decision 返信` に `choiceId`、`requestEventId`、`input` が表示される。

## 7. Sample replay

Dashboard の `sample replay` を押します。

期待結果:

- `pet.updated`、`display.settings_updated`、`notification.created`、`answer.completed`、`prompt.choice_requested` が outbound に追加される。
- Core2 が順に event を poll し、最終的に Choice 画面へ遷移する。

## 8. セキュリティ境界確認

別 PowerShell で誤 token の poll を送ります。

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/device/poll?deviceId=m5stack-sample-001&token=wrong-token"
```

期待結果:

- response が `ok=false`、`reason=invalid-token`。
- Dashboard の security が増える。
- release asset に token、SSID、host IP、会話本文を含めない。

## 未実施として残す範囲

- GRAY 実機 flash / IMU。
- 長時間運用。
- 実 Codex App 内部 API 連携。closed alpha では clipboard / stdin / file relay と Dashboard 操作を実 adapter として扱う。
