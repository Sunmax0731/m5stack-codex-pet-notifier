# Codex Relay 手動確認

この手順は Core2 で「Codex の返答を表示する」必須要件を確認するためのものです。Codex App の非公開内部 API には依存せず、clipboard / stdin / file / local session JSONL から Host Bridge へ返答本文を渡します。

## 前提

- Host Bridge が起動している。
- Core2 が `m5stack-sample-001` として paired されている。
- `Invoke-RestMethod -Uri http://127.0.0.1:8080/health` で `pairedDevices` に `m5stack-sample-001` が出る。

## 1. 直接送信

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "これはCodexの返答表示を確認する本文です。Core2にAnswerとして表示されれば合格です。"
```

期待結果:

- コマンド結果が `ok=true`。
- Core2 が `Answer` 画面へ遷移する。
- summary と body が Core2 に表示される。
- `/events` の outbound に `answer.completed` が出る。

## 2. Clipboard 送信

Codex の返答本文を clipboard に copy してから実行します。

```powershell
cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"
```

期待結果:

- clipboard の本文が Core2 の `Answer` 画面に表示される。
- 日本語本文も PowerShell stdout の文字コードに依存せず UTF-8 のまま送信される。

注意:

- `cmd.exe` 経由の `--text "日本語..."` は Windows の code page に影響される場合があるため、長い日本語本文は clipboard または UTF-8 file watch を優先する。
- clipboard 送信時の `--summary` は ASCII でもよい。本文は clipboard から取得する。

## 3. 日本語表示

```powershell
cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。Core2のAnswer画面で文字化けせずに表示されれば合格です。"
```

期待結果:

- Core2 の `Answer` 画面で日本語の summary と body が文字化けせず表示される。
- 長文の場合も日本語の途中で欠けた文字が出ず、A/C または touch footer でページ移動できる。

## 4. File watch

```powershell
New-Item -ItemType Directory -Force dist | Out-Null
Set-Content -Encoding UTF8 dist\codex-answer.txt "Codex file watch answer"
cmd.exe /d /s /c npm run codex:watch -- --file dist\codex-answer.txt --once
```

期待結果:

- コマンド結果が `ok=true`。
- `/events` の outbound に `answer.completed` が出る。
- Core2 が `Answer` 画面へ遷移し、summary と file 内容が表示される。
- footer が `A up`、`B idle`、`C down` になる。

## 5. Codex session 自動送信

Host Bridge と Core2 pairing が済んだ状態で、別 PowerShell から次を実行します。

```powershell
cmd.exe /d /s /c npm run codex:sessions -- --once --phase any
```

期待結果:

- コマンド結果が `ok=true`。
- `%USERPROFILE%\.codex\sessions` の最新 JSONL から最新 user / assistant のやり取りが抽出される。
- `/events` の outbound に `answer.completed` が出る。
- Core2 が `Answer` 画面へ遷移し、`User:` と `Codex:` を含む最新やり取りが表示される。

継続監視する場合:

```powershell
cmd.exe /d /s /c npm run codex:sessions -- --phase any
```

完了応答だけに絞る場合:

```powershell
cmd.exe /d /s /c npm run codex:sessions -- --phase final
```

Codex Hooks 経由で1回送る場合:

```powershell
cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001
```

Hook 設定例:

```text
docs/codex-hooks.example.json
```

## 6. Choice relay

```powershell
cmd.exe /d /s /c npm run codex:choice -- --prompt "次の作業を選んでください" --choices yes:進める,no:止める,other:別案
```

期待結果:

- Core2 が `Choice` 画面へ遷移する。
- A/B/C の label が表示される。
- A/B/C を押すと `/events` の inbound に `device.reply_selected` が出る。

## 7. Pet relay

```powershell
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
```

期待結果:

- Core2 header の pet avatar が state に応じて色または表情を変える。
- pet avatar が blink / bounce / tail animation を継続する。

## 8. Display relay

```powershell
cmd.exe /d /s /c npm run codex:display -- --pet-scale 2 --ui-text-scale 1 --body-text-scale 1
```

期待結果:

- `/events` の outbound に `display.settings_updated` が出る。
- Core2 header の pet avatar が幅2倍・高さ2倍の4倍面積で表示される。
- text scale を `2` に変更した場合は header / footer または本文の文字サイズが大きくなる。

## 確認コマンド

```powershell
(Invoke-RestMethod -Uri http://127.0.0.1:8080/events).outbound | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8080/health
```

## 対象外

Codex App の非公開内部 API scraping は対象外です。`codex:sessions` はユーザーが明示的に起動する opt-in のローカル session JSONL 監視です。公開された adapter API が提供された場合は、Codex relay の source として追加します。
