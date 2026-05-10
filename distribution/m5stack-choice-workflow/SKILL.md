---
name: m5stack-choice-gate
description: Send three-choice decision prompts from Codex to an M5Stack device through m5stack-codex-pet-notifier, wait for A/B/C or touch replies, and continue work from the selected option. Use when the user asks Codex to decide through M5Stack, asks for Yes/No/Other or A/B/C confirmation on M5Stack, or the active AGENTS.md requires M5Stack Choice Gate for lightweight human-in-the-loop decisions.
---

# M5Stack Choice Gate

Use this skill to ask the user a short three-choice question on M5Stack and treat the A/B/C reply as Codex's next action signal.

## Inputs

- `question`: one short decision question. Keep it readable on a small display.
- `choices`: exactly 2 or 3 choices. Prefer 3 choices.
- `bridge`: default to `M5STACK_BRIDGE_URL`, then `http://127.0.0.1:8080`.
- `deviceId`: default to `M5STACK_DEVICE_ID`, then `m5stack-sample-001`.
- `repo`: default to `M5STACK_PET_REPO`, then `D:\AI\IoT\m5stack-codex-pet-notifier`.
- `waitMs`: default to `M5STACK_DECISION_WAIT_MS`, then `300000`.

## Workflow

1. Confirm the decision is safe for M5Stack. Do not use M5Stack alone for destructive operations, payments, credentials, public release approval, or irreversible infrastructure changes.
2. Reduce the question to a small-screen decision. Put detailed context in chat, issue comments, or the normal Codex response, not in the M5Stack labels.
3. Normalize the options:
   - Yes / No / Other: `yes:Yes,no:No,other:Other`
   - A plan / B plan / C plan: `a:A plan,b:B plan,c:C plan`
   - Continue / Revise / Hold: `continue:Continue,revise:Revise,hold:Hold`
4. If shell access is available, use Direct CLI mode.
5. If shell access is unavailable, output the portable `m5stack-choice` block exactly once.
6. If the command times out or the bridge is unavailable, say that no M5Stack reply was received and ask in chat.
7. After receiving a reply, report `M5Stack choice: <choiceId> / <label>` in one short line, then continue according to the selected option.

## Direct CLI Mode

PowerShell template:

```powershell
$repo = if ($env:M5STACK_PET_REPO) { $env:M5STACK_PET_REPO } else { "D:\AI\IoT\m5stack-codex-pet-notifier" }
$bridge = if ($env:M5STACK_BRIDGE_URL) { $env:M5STACK_BRIDGE_URL } else { "http://127.0.0.1:8080" }
$device = if ($env:M5STACK_DEVICE_ID) { $env:M5STACK_DEVICE_ID } else { "m5stack-sample-001" }
$waitMs = if ($env:M5STACK_DECISION_WAIT_MS) { $env:M5STACK_DECISION_WAIT_MS } else { "300000" }
Push-Location $repo
cmd.exe /d /s /c npm run codex:decision:wait -- --bridge $bridge --device-id $device --question "Proceed with this plan?" --choices yes:Yes,no:No,other:Other --wait-ms $waitMs
Pop-Location
```

Expected success shape:

```json
{
  "ok": true,
  "type": "prompt.choice_requested",
  "eventId": "evt-choice-...",
  "reply": {
    "ok": true,
    "choiceId": "yes",
    "input": "button-a"
  }
}
```

## Portable Block Mode

Use this when direct command execution is not available.

```m5stack-choice
{
  "kind": "m5stack.choice.request",
  "version": 1,
  "bridge": "http://127.0.0.1:8080",
  "deviceId": "m5stack-sample-001",
  "question": "Proceed with this plan?",
  "choices": [
    { "id": "yes", "label": "Yes" },
    { "id": "no", "label": "No" },
    { "id": "other", "label": "Other" }
  ],
  "waitMs": 300000
}
```

## Response Rule

After receiving the reply, report it before acting:

```text
M5Stack choice: yes / Yes
```

Then continue the task according to the selected option.
