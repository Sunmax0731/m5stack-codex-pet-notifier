# AGENTS

このリポジトリでは、ユーザー判断を軽量な三択に落とせる場合に M5Stack Choice Gate を使います。Codex は質問と 2 から 3 個の選択肢を Host Bridge へ送り、M5Stack の A/B/C 返信を作業判断として受け取ります。

## M5Stack Choice Gate

- `Yes / No / Other`、`A案 / B案 / C案`、`進める / 修正する / 保留する` のように、短い選択肢で判断できる場面で使う。
- 質問文は短く具体的にする。目安は 80 文字以内。
- 選択肢ラベルは M5Stack 画面で読める短さにする。目安は 16 文字以内。
- `Other` は自由記述ではなく、チャットへ戻して追加説明や別案を求める意味で扱う。
- 破壊的操作、公開操作、課金、資格情報、不可逆な変更は M5Stack だけで確定せず、チャット上でも明示確認する。
- Host Bridge が使える場合は `codex:decision:wait` を実行して返信を待つ。
- Host Bridge が使えない場合は `m5stack-choice` fenced block を出力し、ユーザーまたは外部 wrapper に実行を委ねる。
- timeout した場合は「M5Stack から返信が得られなかった」と明記し、チャットで確認する。
- 返信を受け取ったら `M5Stack choice: <choiceId> / <label>` を短く記録し、その選択肢に沿って作業を続ける。

## Environment

既定値で動かない環境では、必要に応じて以下を設定します。

```powershell
$env:M5STACK_PET_REPO = "D:\AI\IoT\m5stack-codex-pet-notifier"
$env:M5STACK_BRIDGE_URL = "http://127.0.0.1:8080"
$env:M5STACK_DEVICE_ID = "m5stack-sample-001"
$env:M5STACK_DECISION_WAIT_MS = "300000"
```

## Choice ID

- Yes / No / Other: `yes`, `no`, `other`
- A案 / B案 / C案: `a`, `b`, `c`
- 作業継続: `continue`, `revise`, `hold`

## Direct CLI Command

```powershell
cd $env:M5STACK_PET_REPO
cmd.exe /d /s /c npm run codex:decision:wait -- --bridge $env:M5STACK_BRIDGE_URL --device-id $env:M5STACK_DEVICE_ID --question "この方針で進めますか?" --choices yes:Yes,no:No,other:Other --wait-ms 300000
```

## Portable Block

Shell 実行できない環境では、Codex は次の block を出力します。

```m5stack-choice
{
  "kind": "m5stack.choice.request",
  "version": 1,
  "bridge": "http://127.0.0.1:8080",
  "deviceId": "m5stack-sample-001",
  "question": "この方針で進めますか?",
  "choices": [
    { "id": "yes", "label": "Yes" },
    { "id": "no", "label": "No" },
    { "id": "other", "label": "Other" }
  ],
  "waitMs": 300000
}
```
