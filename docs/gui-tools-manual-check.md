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

- topbar には言語、テーマ、更新、debug JSON の操作だけが表示され、旧ヘッダー文言やBridge行は表示されない。
- sidebar 内の状態確認 section に paired、outbound、inbound、security の数値が表示される。
- `debug JSON` を開くと `/debug/snapshot` の JSON が表示される。
- `最近の Codex 回答` panel が表示され、`読込` と `M5Stackへ送信` button がある。
- side menu はプレビュー、最近の回答、ログへ移動できる。`状態確認` section は sidebar 内に常時表示されるため、状態 button は表示されない。独立した `送信` menu と `デバッグ` menu も表示されない。
- Answer / Decision / Notify の送信、sample replay、各種 debug command は `環境構築コマンド` modal の `デバッグ送信` tab に集約され、重複する直接送信フォームは表示されない。
- `M5Stack 表示プレビュー` に Pet 設定、pet display area、UI text size、body text size、render FPS、motion step が統合されている。
- `M5Stack 表示プレビュー` があり、現在の hatch-pet キャラで Pet / Answer / Decision / Notify の simulated display を送信前に確認できる。
- `M5Stack 表示プレビュー` で Core2 / button reference、local hatch-pet asset、screen background RGBA、pet background RGBA、text color RGBA、text background RGBA、text border RGBA、pet X/Y offset、Codex answer beep を変更できる。各色は1つの RGBA picker で色と透明度を操作でき、現在色の swatch と `#hex / alpha` が同じ項目内に表示される。
- `変更を自動送信` がonの場合、表示パラメータ変更後に短い待ち時間を置いて実機へ自動送信される。offの場合は `表示設定を送信` を押して反映する。
- `M5Stack 表示プレビュー` は1ペインで全幅表示され、画面プレビュー、readout、asset、表示設定が同じ section 内で見通せる。
- 最近の Codex 回答とイベントログは左右ペインで並ぶ。
- sidebar に Bridge runtime status があり、foreground / background、pid、uptime が見える。
- 主要項目の `?` icon を click すると tooltip hint が表示される。
- topbar に `言語` と `テーマ` があり、既定は日本語、テーマはOSに追従する。手動でEnglish / light / darkへ切り替えできる。
- 各 section の `Hide` / `View` で折りたたみできる。
- sidebar の `環境構築コマンド` から setup / debug command modal を開ける。
- command modal は `環境構築`、`デバッグ送信` のタブを持つ。重複していた保守タブは廃止し、sample replay はデバッグ送信tabへ統合されている。
- command modal で Bridge background 起動 / 再起動、pet asset 生成、Core2 upload、Codex answer、ABC Decision、Notification、Display settings、Codex session、sample replay を任意パラメータで実行できる。実行結果は modal 下部の output に表示される。
- command modal の実行 button は各 card 下部に一定高さで表示され、入力欄の量によって極端に縦長にならない。
- `/health` の `version` が `0.2.0-beta.1` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が 8080 番に残っているため、その PowerShell を閉じてから再起動する。8080を閉じられない場合は `bridge:start:bg -- --port=18081` で最新Bridgeを起動し、Dashboardが最新Bridge APIを自動検出していることを確認する。
- Bridge 再起動直後に `security` が増えても、数秒後に paired が `1` へ戻り、`/events` の security log に `token-rehydrated` が出れば既存実機 token の再取り込みは成功です。

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

Dashboard の `M5Stack 表示プレビュー` で state を `celebrate` または `reacting` にして `Pet 更新を送信` を押します。続けて mood を `happy`、`confused`、`alert`、`sleepy` に切り替えます。

期待結果:

- outbound に `pet.updated` が出る。
- Core2 の pet surface が `Mira` などの hatch-pet asset として表示される。
- Core2 の local hatch-pet asset では図形 marker が重ならず、`celebrate` / `happy` は jumping row、`reacting` / `surprised` は waving row、`confused` は review row、`alert` / `sleepy` は failed row のキャラクターイラストに切り替わる。
- avatar が静止画ではなく、frame / bounce の周期変化を続ける。
- pet avatar box は `M5Canvas` Sprite buffer 経由で更新され、pet に重なった本文、Decision label、footer は animation tick ごとにちらつかない。
- `firmware/include/pet_asset.local.h` を削除して build した fallback vector だけの見た目ではない。
- Display 設定を `1/32`、`8/32`、`16/32`、`32/32` に変えたとき、Core2 は scale ごとの高解像度 frame を選び、`32/32` では画面外にはみ出す超拡大表示になる。

## 4.1 Display 設定とプレビュー

Dashboard の `M5Stack 表示プレビュー` を開き、次を送信します。

- `pet display area`: `8/32`、`16/32`、`32/32`
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
- Dashboard の `実機反映` indicator が `反映待ち` になり、送信eventIdを表示する。
- `変更を自動送信` がonの場合は、slider / RGBA / offset 変更から1秒程度で outbound に `display.settings_updated` が追加される。
- 10 秒程度待った後の inbound `device.heartbeat` details に `display.applyCount` と `display.lastEventId` が出る。`display.petScale`、`display.petOffsetX/Y`、`display.screenBackgroundRgba`、`display.petBackgroundRgba`、`display.textBackgroundRgba`、`display.visualProbe` が送信した値と一致し、Dashboard の `実機反映` indicator が `反映済み` になる。
- `反映確認を表示` がonの場合、Core2 に短時間 `display applied` の反映確認画面が出る。ここで色と offset 値が見えるため、通信同期と通常描画の切り分けに使う。
- 古い Host Bridge process が残っている場合は fallback として `pet.updated` が出る。この場合も Core2 の display 設定が変われば合格とする。
- Core2 は `Codex Pet`、`state`、`LAN`、`U:0` などの固定ヘッダーテキストを表示しない。
- `petScale=8` では pet が画面全体に近く表示され、`petScale=32` では画面外にはみ出す超拡大表示になる。
- `screen background` を変えると、pet 背景以外の画面全体の背景色が変わる。
- local hatch-pet asset の透明ピクセル部分に pet background RGBA が見え、以前の固定アクセント色カードに見えない。
- `pet X/Y offset` を変えると pet が上下左右に移動し、値によっては画面外にはみ出す。

今回の同期確認結果は `docs/browser-device-sync-evidence.json` に保存しています。ブラウザ上の表示値と `device.heartbeat.details.display` の返却値、`display.lastEventId` と outbound `display.settings_updated.eventId` が一致していることを確認できます。
- `text background` を変えると Answer / Decision / Notification の本文パネルと footer の全ての文字背景に反映される。alpha `0` では本文パネルと footer の塗りが消え、文字だけが表示される。
- プレビュー上の pet をドラッグすると `pet X/Y offset` slider と readout が更新され、`位置リセット` を押すと `0 px / 0 px` に戻る。
- `テキスト枠を表示` を on にすると本文パネルと footer に枠線が出る。off にすると消える。`text border` の色 / alpha も反映される。
- Dashboard preview の footer label は `A poll` が左、`B pet` が中央、`C idle` が右に揃い、実機の表示位置と一致する。
- Core2 では `petScale` に対応する scale-specific frame が描画され、低解像度 base frame の単純拡大より輪郭と模様が読みやすい。
- `UI text size` を変更すると footer の文字サイズが変わる。
- `body text size` を変更すると Answer / Notification の本文サイズが変わり、1ページに入る文字量が変わる。
- `render FPS` を `4`、`12`、`20`、`motion step` を `120`、`280`、`600` に変えると、描画更新上限と pet frame / bounce の切替頻度が分離して変わる。
- `20fps` にしても画面全体の黒塗りや footer / body text の明滅は起きず、pet avatar box と text overlay が安定して見える。
- Dashboard の M5Stack 表示プレビューも slider、FPS、RGBA、Core2 / button reference、local hatch-pet asset 変更を即時反映する。
- 次回 `answer.completed` 到着時に短い beep が鳴る。`Codex回答のビープ通知` を off にして再送すると鳴らない。

## 4.2 Command modal と background bridge

Dashboard の sidebar で `環境構築コマンド` を押します。

期待結果:

- modal 上部に `環境構築`、`デバッグ送信` のタブが表示され、`保守` タブは表示されない。
- `環境構築` tab で Bridge background 起動と Bridge 再起動を実行できる。再起動後は数秒で Dashboard が再接続し、sidebar runtime status の pid / uptime が更新される。
- `環境構築` tab で `petDir` と `output` を変えて pet asset 生成を実行できる。
- `環境構築` tab で `uploadPort` を空欄または `COM3` などにして Core2 upload を実行できる。
- `デバッグ送信` tab で Answer、Decision、Notification、Display settings、Codex session、sample replay の値を変更し、button 実行で outbound に反映できる。
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

- 実署名 MSI / MSIX。
- 複数 M5Stack 同時接続。今回対象外で今後のアップデート対象。
- Wi-Fi AP停止 / 復帰。今回の 8時間 soak には含めない。
- 実 Codex App Server 接続は `codex:app-server:probe -- --include-turn` で確認済み。beta では clipboard / stdin / file relay、Codex session watcher、Codex hook relay、Dashboard 操作、Codex App Server runtime probe を実 adapter 境界として扱う。
