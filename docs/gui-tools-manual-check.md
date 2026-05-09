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
- `/health` の `version` が `0.1.0-alpha.5` 以外、または `/debug/snapshot` が 404 の場合は古い Host Bridge が 8080 番に残っているため、その PowerShell を閉じてから再起動する。

## 2. M5Stack の pairing と状態確認

Core2 を起動し、Wi-Fi 接続と pairing を待ちます。

期待結果:

- Core2 のヘッダーに pet avatar が表示され、数秒ごとに blink / bounce / tail が変化する。
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
- Core2 ヘッダーの pet avatar が `Mira` などの hatch-pet asset として表示される。
- Core2 ヘッダーの pet avatar の背景色または表示状態が変わる。
- avatar が静止画ではなく、frame / bounce の周期変化を続ける。
- `firmware/include/pet_asset.local.h` を削除して build した fallback vector だけの見た目ではない。

## 5. ABC 返信ワークフロー

Dashboard の `Choice` tab で prompt と A/B/C label を入力し、`Choice を送信` を押します。

期待結果:

- outbound に `prompt.choice_requested` が出る。
- Core2 が Choice 画面へ遷移し、A/B/C の label が表示される。
- Core2 の A/B/C のいずれかを押すと、Dashboard の inbound に `device.reply_selected` が出る。
- `ABC 返信ワークフロー` panel に `choiceId`、`requestEventId`、`input` が表示される。

## 6. Sample replay

Dashboard の `sample replay` を押します。

期待結果:

- `pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested` が outbound に追加される。
- Core2 が順に event を poll し、最終的に Choice 画面へ遷移する。

## 7. セキュリティ境界確認

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
