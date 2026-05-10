# M5Stack 三択 Choice Workflow

## 目的

Codex が作業中にユーザー判断を必要としたとき、チャット上で長い確認を返す代わりに、M5Stack へ `Yes / No / Other` または `A案 / B案 / C案` の三択を送り、M5Stack の A/B/C 入力を Codex 側の次アクションへ戻すための配布用スキームです。

配布時には `distribution/m5stack-choice-workflow/AGENTS.md` と `distribution/m5stack-choice-workflow/SKILL.md` を渡します。対象ユーザーはその 2 ファイルを自分のリポジトリ、または Codex skill directory へ配置するだけで、同じ運用ルールを使えます。

## 実行モード

### Direct CLI mode

Host Bridge と `m5stack-codex-pet-notifier` repository が同じ PC にある場合、Codex は `codex:decision:wait` を実行します。M5Stack の返信が来るまで待ち、戻り値の `reply.choiceId` に基づいて作業を続けます。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run codex:decision:wait -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001 --question "この変更で進めますか?" --choices yes:Yes,no:No,other:Other --wait-ms 300000
```

### Portable block mode

Shell 実行や Host Bridge へ直接アクセスできない Codex 環境では、下記の fenced block を出力します。外部 wrapper またはユーザーはこの block を読み取り、Host Bridge の `/codex/decision` または CLI へ渡します。

```m5stack-choice
{
  "kind": "m5stack.choice.request",
  "version": 1,
  "bridge": "http://127.0.0.1:8080",
  "deviceId": "m5stack-sample-001",
  "question": "この変更で進めますか?",
  "choices": [
    { "id": "yes", "label": "Yes" },
    { "id": "no", "label": "No" },
    { "id": "other", "label": "Other" }
  ],
  "waitMs": 300000
}
```

## Choice ID

| 用途 | 推奨 ID | 表示例 |
| --- | --- | --- |
| Yes / No / Other | `yes`, `no`, `other` | `Yes`, `No`, `Other` |
| A案 / B案 / C案 | `a`, `b`, `c` | `A案`, `B案`, `C案` |
| 作業継続判断 | `continue`, `revise`, `hold` | `進める`, `修正する`, `保留する` |

M5Stack の画面幅に収めるため、質問文は 80 文字程度、各 label は 16 文字程度を目安にします。詳細説明は Codex の通常返信や issue/comment に残し、M5Stack には選択に必要な最小文だけ送ります。

## Codex の応答ルール

1. 三択で安全に意思決定できる場面だけ M5Stack Choice Gate を使う。
2. `Other` は自由記述ではなく、チャット側へ戻して追加説明を求めるための選択肢として扱う。
3. 破壊的操作、資格情報、支払い、公開範囲変更などの高リスク判断は M5Stack だけで確定せず、チャットでも明示確認する。
4. Direct CLI mode が使える場合、Codex は実際に `codex:decision:wait` を実行する。
5. 返信を受け取ったら `M5Stack choice: <choiceId> / <label>` を短く記録し、その選択肢に沿って続行する。
6. timeout または bridge 不通の場合は、M5Stack の応答が得られなかったことを明記し、チャットで確認する。

## 導入

### Repository local

対象リポジトリの root に、配布物の `AGENTS.md` と `SKILL.md` をコピーします。既存ファイルがある場合は、M5Stack Choice Gate section だけを追記します。

```powershell
Copy-Item .\distribution\m5stack-choice-workflow\AGENTS.md D:\path\to\target-repo\AGENTS.md
Copy-Item .\distribution\m5stack-choice-workflow\SKILL.md D:\path\to\target-repo\SKILL.md
```

### Codex skill directory

複数リポジトリで使う場合は、Skill を Codex の skill directory に配置します。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills\m5stack-choice" | Out-Null
Copy-Item .\distribution\m5stack-choice-workflow\SKILL.md "$env:USERPROFILE\.codex\skills\m5stack-choice\SKILL.md"
```

### Environment variables

配布先の環境に合わせて、必要な値だけ設定します。

```powershell
$env:M5STACK_PET_REPO = "D:\AI\IoT\m5stack-codex-pet-notifier"
$env:M5STACK_BRIDGE_URL = "http://127.0.0.1:8080"
$env:M5STACK_DEVICE_ID = "m5stack-sample-001"
$env:M5STACK_DECISION_WAIT_MS = "300000"
```

## 配布 ZIP

配布物を ZIP にまとめる場合は次を実行します。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run choice:package
```

生成先:

- `dist/m5stack-choice-workflow-kit.zip`
