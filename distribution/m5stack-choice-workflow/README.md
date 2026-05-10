# M5Stack Choice Workflow Kit

この kit は、Codex が M5Stack Core2 / GRAY に三択判断を送り、A/B/C の返信を作業判断へ戻すための配布用 `AGENTS.md` / `SKILL.md` です。

## 含まれるもの

- `AGENTS.md`: 対象リポジトリに置く運用ルール。
- `SKILL.md`: Codex skill として使える実行手順。
- `examples/m5stack-choice-request.json`: portable block mode の JSON 例。

## 使い方

1. `m5stack-codex-pet-notifier` を起動し、M5Stack を同じ LAN の Host Bridge に pairing します。
2. 配布先 repo root に `AGENTS.md` と `SKILL.md` を配置します。既存ファイルがある場合は M5Stack Choice Gate section だけ追記します。
3. 複数 repo で使う場合は `SKILL.md` を `%USERPROFILE%\.codex\skills\m5stack-choice\SKILL.md` に配置します。
4. 必要に応じて環境変数を設定します。

```powershell
$env:M5STACK_PET_REPO = "D:\AI\IoT\m5stack-codex-pet-notifier"
$env:M5STACK_BRIDGE_URL = "http://127.0.0.1:8080"
$env:M5STACK_DEVICE_ID = "m5stack-sample-001"
$env:M5STACK_DECISION_WAIT_MS = "300000"
```

## 代表コマンド

```powershell
cd $env:M5STACK_PET_REPO
cmd.exe /d /s /c npm run codex:decision:wait -- --bridge $env:M5STACK_BRIDGE_URL --device-id $env:M5STACK_DEVICE_ID --question "この方針で進めますか?" --choices yes:Yes,no:No,other:Other --wait-ms 300000
```

返信が返ると JSON の `reply.choiceId` に `yes` / `no` / `other` などが入ります。
