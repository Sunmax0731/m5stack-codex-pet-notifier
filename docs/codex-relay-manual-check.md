# Codex Relay 手動確認

この手順は Core2 で「Codex の返答を表示する」必須要件を確認するためのものです。Codex App の非公開内部 API には依存せず、clipboard / stdin / file から Host Bridge へ返答本文を渡します。

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

## 3. File watch

```powershell
New-Item -ItemType Directory -Force dist | Out-Null
Set-Content -Encoding UTF8 dist\codex-answer.txt "Codex file watch answer"
cmd.exe /d /s /c npm run codex:watch -- --file dist\codex-answer.txt --once
```

期待結果:

- file 内容が `answer.completed` として送信される。

## 確認コマンド

```powershell
(Invoke-RestMethod -Uri http://127.0.0.1:8080/events).outbound | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8080/health
```

## 対象外

Codex App の非公開内部 API scraping は対象外です。公開された adapter API が提供された場合は、Codex relay の source として追加します。
