# Adapter 見直し

## 対象

今回の見直し対象は Host Bridge、device adapter、Codex adapter です。GRAY 実機と GRAY IMU は release target から外し、Core2 を実機対象に固定します。

## Device Adapter

- `core2` を唯一の release target とする。
- `gray` は Dashboard の button reference preview と legacy scenario 互換のため残すが、`releaseTarget=false` とし IMU を持たせない。
- `device.pet_interacted` から `imu-tap` と target `imu` を削除し、Core2 touch / swipe / button の contract へ寄せる。

## Host Adapter / Bridge

- long press から `prompt.choice_requested` を queue する workflow は維持する。
- queue / log cap、device stale 診断、latest heartbeat summary を追加し、長時間稼働で memory と Dashboard 情報量が無制限に増えないようにした。
- token rehydrate は実機再起動や Host Bridge 再起動の復帰用に維持する。

## Codex Adapter

- `local-session-jsonl` と `codex-hook-relay` は実装済み fallback として維持する。
- `codex-app-server` は公開 interface 連携の runtime probe 済み adapter として追加した。`initialize`、`thread/start`、`turn/start` の実接続は `docs/codex-app-server-runtime-probe-result.json` に残す。
- adapter review は次で再生成する。

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run adapter:review
```

## 完了条件

- `cmd.exe /d /s /c npm test` が通る。
- `dist/adapter-review-result.json` に `privateApiScraping=false` と `codex-app-server` prepared が出る。実接続可否は `codex:app-server:probe -- --include-turn` で別 evidence 化する。
- README、manual test、release notes が GRAY 実機 / GRAY IMU を対象外として扱う。
