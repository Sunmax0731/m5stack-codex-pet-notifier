# GUI ツール手動確認手順

この手順は Host Bridge 同梱ダッシュボード、Codex-M5Stack 通信、ペット描画、ABC 返信ワークフローを実機で確認するためのものです。

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
E:\DevEnv\PlatformIO\venv\Scripts\pio.exe run -d firmware -e m5stack-core2 -t upload --upload-port COM4
```

## 1. Host Bridge と Dashboard を起動する

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8080/
```

期待結果:

- `M5Stack Codex Pet Console` が表示される。
- 状態確認に paired、outbound、inbound、security の数値が表示される。
- `debug JSON` を開くと `/debug/snapshot` の JSON が表示される。
- `最近の Codex 回答` panel が表示され、`読込` と `M5Stackへ送信` button がある。
- side menu があり、状態、送信、プレビュー、ABC 返信、Codex 回答、ログ、デバッグへ移動できる。
- `Display` tab があり、pet display area、UI text size、body text size を `1..8`、animation FPS を `4..20` で変更できる。
- `M5Stack 表示プレビュー` があり、Pet / Answer / Choice / Notify の simulated display を送信前に確認できる。
- command panel に `codexSessions` と `codexHook` が表示され、Codex session 自動送信と hook relay の起動コマンドを確認できる。
- `/health` の `version` が `0.1.0-alpha.5` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が 8080 番に残っているため、その PowerShell を閉じてから再起動する。

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

Dashboard の `Pet` tab で state を `celebrate` または `reacting` にして `Pet 更新を送信` を押します。

期待結果:

- outbound に `pet.updated` が出る。
- Core2 の pet surface が `Mira` などの hatch-pet asset として表示される。
- Core2 の pet surface の背景色または表示状態が変わる。
- avatar が静止画ではなく、frame / bounce の周期変化を続ける。
- `firmware/include/pet_asset.local.h` を削除して build した fallback vector だけの見た目ではない。
- Display 設定を `1/8`、`4/8`、`8/8` に変えたとき、Core2 は scale ごとの高解像度 frame を選び、同じ低解像度 frame をブロック状に拡大した見た目にならない。

## 4.1 Display 設定とプレビュー

Dashboard の `Display` tab を開き、次を送信します。

- `pet display area`: `8/8`
- `UI text size`: `2/8`
- `body text size`: `2/8`
- `animation FPS`: `12fps`

期待結果:

- Dashboard の send result が `ok=true`。
- outbound に `display.settings_updated` が出る。
- 古い Host Bridge process が残っている場合は fallback として `pet.updated` が出る。この場合も Core2 の display 設定が変われば合格とする。
- Core2 は `Codex Pet`、`state`、`LAN`、`U:0` などの固定ヘッダーテキストを表示しない。
- `petScale=8` では pet が画面全体に近い最大面積で表示される。
- Core2 では `petScale` に対応する scale-specific frame が描画され、低解像度 base frame の単純拡大より輪郭と模様が読みやすい。
- `UI text size` を変更すると footer の文字サイズが変わる。
- `body text size` を変更すると Answer / Notification の本文サイズが変わり、1ページに入る文字量が変わる。
- `animation FPS` を `4`、`12`、`20` に変えると、pet frame / bounce の更新速度が変わる。
- Dashboard の M5Stack 表示プレビューも slider 変更と FPS 設定を即時反映する。

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

## 6. ABC 返信ワークフロー

Dashboard の `Choice` tab で prompt と A/B/C label を入力し、`Choice を送信` を押します。

期待結果:

- outbound に `prompt.choice_requested` が出る。
- Core2 が Choice 画面へ遷移し、A/B/C の label が表示される。
- Core2 の A/B/C のいずれかを押すと、Dashboard の inbound に `device.reply_selected` が出る。
- `ABC 返信ワークフロー` panel に `choiceId`、`requestEventId`、`input` が表示される。

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
