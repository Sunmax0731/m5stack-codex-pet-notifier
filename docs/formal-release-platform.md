# 正式リリース向けプラットフォーム整備

## Beta Baseline

`v0.2.0-beta.1` 時点の platform baseline は、PC の Host Bridge、M5Stack Core2 firmware、Dashboard、Codex relay、Codex session watcher、Codex hook relay、Codex App Server adapter preparation、hatch-pet asset 連携、pet mood / gesture interaction、Windows user-local installer、署名付き MSI / MSIX preparation で構成します。M5Stack は Codex App の内部 API に依存せず、LAN 内の JSON event contract だけを扱います。GRAY 実機と GRAY IMU は release target 外です。

## 追加済み Platform Capability

| Capability | 状態 | 根拠 |
| --- | --- | --- |
| Codex decision request | 実装済み | `npm run codex:decision`、`npm run codex:decision:wait`、`/codex/decision`、Dashboard Decision tab |
| Current pet preview | 実装済み | `/pet/current/manifest`、`/pet/current/spritesheet.webp`、Dashboard preview |
| Pet render / motion separation | 実装済み | `animationFps` と `motionStepMs` を分離 |
| Collapsible dashboard sections | 実装済み | `section-toggle` による View / Hide |
| Click help hints | 実装済み | `?` icon と `data-tooltip` field hints |
| Setup command modal | 実装済み | sidebar の `環境構築コマンド` modal。環境構築 / デバッグ送信のtabとlocalhost限定のallowlist command実行を含む。sample replay はデバッグ送信tabへ統合 |
| Background bridge runtime | 実装済み | `npm run bridge:start:bg`、`/debug/runtime`、sidebar runtime status |
| Pet mood / gesture workflow | 実装済み | `pet.updated.pet.mood`、Core2 touch gesture、`device.pet_interacted`、long press -> `prompt.choice_requested` |
| Windows installer / launcher | 実装済み | `installer/install-windows.ps1`、`installer/M5StackCodexPetNotifier-Setup.bat`、`start-dashboard.bat`、`tools/start-dashboard-hidden.ps1` |
| Long-run diagnostics | 実装済み | Host Bridge queue/log 上限、stale diagnostics、heartbeat age、firmware HTTP timeout / Wi-Fi / poll backoff |
| Codex App Server runtime probe | 実装済み | `src/codex-adapter/appServerAdapter.mjs`、`scripts/codex-app-server-adapter-smoke.mjs`、`tools/codex-app-server-runtime-probe.mjs`、`docs/codex-app-server-runtime-probe-result.json` |
| Adapter review | 実装済み | `tools/adapter-review.mjs`、private API scraping 禁止 |
| Signed MSI / MSIX pipeline | 準備済み | `installer/wix/Product.wxs`、`installer/msix/Package.appxmanifest`、`tools/windows-signing-check.mjs`、`tools/signed-installer-pipeline.mjs`、`docs/signed-installer-pipeline-result.json` |
| Manual gate automation | 準備済み | `tools/formal-release-automation.mjs`、`tools/core2-soak-runner.mjs`、`docs/manual-test-automation.md`、`docs/formal-release-automation-result.json` |

## Release Candidate Workstreams

1. Device reliability
   - Core2 常時接続、Host Bridge 再起動、token 失効時の再pairingを 8 時間以上の運用で確認する。
   - heartbeat age、stale flag、dropped event count、poll backoff、Wi-Fi reconnect backoff を証跡化する。
   - Wi-Fi AP停止 / 復帰は今回の soak から外し、実施タイミングを指定した別 gate として扱う。

2. Codex workflow
   - `codex:decision:wait` を Codex Hooks または session workflow から呼べる運用例として固定する。
   - A/B/C 返信結果を次の Codex prompt に渡す adapter を追加候補にする。
   - Codex App Server の実 process に接続し、`initialize`、`thread/start`、`turn/start` の end-to-end を確認済み。次は turn notification から M5Stack event への mapper を追加する。

3. Dashboard productization
   - Preview と実機 layout の差分を継続的に smoke で検出する。
   - tooltip、collapse、command modal、current pet preview を browser smoke の必須チェックにする。

4. Privacy and packaging
   - local pet spritesheet、Wi-Fi 設定、session 本文、token は release asset に含めない。
   - `/pet/current/*` は local Dashboard preview 用であり、public release artifact ではないことを明記する。
   - 実署名証明書で MSI / MSIX を作成し、`signtool verify` と installer 起動を証跡化する。

## Candidate Additions

| Candidate | 目的 | 優先 |
| --- | --- | --- |
| reply-to-Codex prompt adapter | `codex:decision:wait` の結果を次の Codex prompt へ自動投入する | High |
| device reconnect dashboard | 最終 heartbeat、RSSI、pending event、last poll を GUI で見る | High |
| signed MSI/MSIX release environment | WiX / Windows SDK / 署名証明書を用意し、pipeline で署名済み release asset を検証する | High |
| Codex App Server event mapper | public App Server の turn notification を `answer.completed` / `prompt.choice_requested` へ変換する | High |
| firmware settings persistence | `petScale`、text size、motion step を再起動後も維持する | Medium |
| OTA update | USB 接続なしで firmware 更新する | Medium |
| multiple M5Stack / MQTT adapter | 複数端末や Home Assistant と接続する。今回対象外、今後アップデート | Low |

## Manual Gate

正式リリース候補へ進める前に、`docs/manual-test.md` の Core2 項目、長時間運用、Dashboard current pet preview、Codex decision request、署名付き MSI / MSIX、実 Codex App Server 接続を確認します。今回の長時間運用では Wi-Fi AP停止 / 復帰を含めません。GRAY 実機と GRAY IMU は対象外です。未実施項目がある場合は stable release ではなく prerelease とします。
