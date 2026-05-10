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

## 6. Decision relay

```powershell
cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"
```

期待結果:

- Core2 が `Choice` / Decision 画面へ遷移する。
- A/B/C の label が表示される。
- A/B/C を押すと `/events` の inbound に `device.reply_selected` が出る。

Codex 側コマンドで返信まで待つ場合:

```powershell
cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000
```

期待結果:

- M5Stack の A/B/C 返信後に command result の `reply.choiceId` が `continue`、`revise`、`hold` のいずれかになる。
- timeout した場合は command が失敗し、Codex 側で未回答として扱える。

## 7. Pet relay

```powershell
cmd.exe /d /s /c npm run codex:pet -- --name "Codex Pet" --state celebrate
```

期待結果:

- Core2 の local hatch-pet asset は state / mood に応じてキャラクターイラストの表情 / 姿勢 row を変える。local asset がない場合だけ fallback avatar の色または簡易表情で近似する。
- pet avatar が blink / bounce / tail animation を継続する。
- animation tick 中に画面全体、Answer / Choice の本文、footer が明滅せず、pet surface だけが更新される。

## 8. Display relay

```powershell
cmd.exe /d /s /c npm run codex:display -- --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12 --motion-step-ms 280
```

期待結果:

- `/events` の outbound に `display.settings_updated` が出る。
- Core2 は固定ヘッダーテキストを表示せず、pet が画面全体に近い最大面積で表示される。
- text size を `2` 以上に変更した場合は footer または本文の文字サイズが大きくなる。
- render FPS は `12fps` になり、描画更新上限として反映される。
- motion step は `280ms` になり、pet frame / bounce の切替頻度として反映される。
- `20fps` へ上げても小刻みに震えず、body / footer text のちらつきが増えない。

## 確認コマンド

```powershell
(Invoke-RestMethod -Uri http://127.0.0.1:8080/events).outbound | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8080/health
```

## 対象外

Codex App の非公開内部 API scraping は対象外です。`codex:sessions` はユーザーが明示的に起動する opt-in のローカル session JSONL 監視です。公開された adapter API が提供された場合は、Codex relay の source として追加します。
