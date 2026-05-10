# 手動テスト自動化方針

## 結論

手作業テストは大半を自動化できます。ただし Core2 実機の接続、Wi-Fi AP の停止 / 復帰、Windows 署名証明書、Codex account / model access は外部環境に依存します。そのため、正式リリースでは「人が環境を用意し、Codex 側が実行と evidence 収集を自動化する」方式にします。

GRAY 実機と GRAY IMU は今回の自動化対象外です。複数 M5Stack 同時接続は今後のアップデート対象として残します。

## 追加コマンド

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run formal:automation -- --include-turn
```

このコマンドは以下を実行し、`dist/formal-release-automation-result.json` と `docs/formal-release-automation-result.json` に結果を保存します。

- `npm test`
- `installer:signed:pipeline`
- `codex:app-server:probe`

短時間で署名 / Codex App Server だけを確認する場合:

```powershell
cmd.exe /d /s /c npm run formal:automation -- --skip-npm-test --include-turn
```

Core2 実機の soak を含める場合:

```powershell
cmd.exe /d /s /c npm run core2:soak -- --duration-min=480 --skip-wifi-interruption
cmd.exe /d /s /c npm run formal:automation -- --skip-npm-test --include-turn
```

`--skip-wifi-interruption` は、Wi-Fi AP停止 / 復帰を今回の検証対象から外すための明示フラグです。

## 手動項目ごとの自動化状態

| Gate | 状態 | 自動化内容 | 残る外部前提 |
| --- | --- | --- | --- |
| LR-01 長時間 soak | 自動化済み | `core2:soak` が heartbeat age、stale、droppedEvents を `docs/core2-soak-result.json` へ保存 | Core2 実機を 8時間以上接続し続ける環境 |
| LR-02 Wi-Fi AP停止 / 復帰 | 今回対象外 | firmware 側 backoff / pairing 復帰は source gate と実機 heartbeat で確認可能 | AP停止 / 復帰操作、Core2 serial log。今回の soak には含めない |
| SIGN-01 署名 MSI / MSIX | 自動化済み | `installer:signed:pipeline` が WiX / MSIX payload / 署名 / verify の証跡を生成 | WiX、Windows SDK、署名証明書 |
| API-01 Codex App Server | 自動化済み | `codex:app-server:probe --include-turn` が `initialize`、`thread/start`、`turn/start` を実行 | Codex CLI login と model access |

## 署名付き installer

```powershell
cmd.exe /d /s /c npm run installer:signed:pipeline
```

実署名まで行う場合:

```powershell
$env:WINDOWS_SIGNING_CERT_THUMBPRINT="..."
$env:WINDOWS_SIGNING_ENABLE="1"
cmd.exe /d /s /c npm run installer:signed:pipeline -- --sign
```

PFX password をコマンドラインへ渡す経路は既定では止めています。CI / release では PFX を Windows certificate store へ import し、`WINDOWS_SIGNING_CERT_THUMBPRINT` で署名します。

## Codex App Server

```powershell
cmd.exe /d /s /c npm run codex:app-server:probe -- --include-turn
```

probe は OpenAI 公式の Codex App Server JSON-RPC interface を使います。非公開 API scraping、Codex App の DOM 読み取り、session 本文の evidence 保存は行いません。schema は `schemas/codex-app-server/` に固定します。

## evidence

自動化結果は以下に保存します。

- `docs/core2-soak-result.json`
- `docs/signed-installer-pipeline-result.json`
- `docs/codex-app-server-runtime-probe-result.json`
- `docs/formal-release-automation-result.json`

これらの JSON には回答本文、token、SSID、host IP、PFX password を保存しません。
