# 署名付き MSI / MSIX 準備

## 方針

現在の配布物は user-local shortcut installer ZIP です。正式配布へ進めるため、署名付き MSI / MSIX の前提確認とテンプレートを追加します。証明書、PFX、password、timestamp service の秘密情報は repo に保存しません。

## 追加成果物

- `installer/wix/Product.wxs`: per-user MSI の WiX v4 テンプレート。
- `installer/msix/Package.appxmanifest`: MSIX manifest テンプレート。
- `tools/windows-signing-check.mjs`: `signtool.exe`、`wix.exe`、`makeappx.exe`、`makepri.exe` と signing env を確認する readiness checker。
- `tools/signed-installer-pipeline.mjs`: installer ZIP payload から WiX source と MSIX payload を生成し、環境がそろっている場合は unsigned artifact 作成、署名、`signtool verify` まで実行する pipeline。
- `dist/windows-signing-readiness.json`: readiness checker の出力。
- `dist/signed-installer-pipeline-result.json` / `docs/signed-installer-pipeline-result.json`: 署名 pipeline の evidence。

## コマンド

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run installer:signing:check
cmd.exe /d /s /c npm run installer:signed:pipeline
```

実署名を行う場合:

```powershell
$env:WINDOWS_SIGNING_CERT_THUMBPRINT="..."
$env:WINDOWS_SIGNING_ENABLE="1"
cmd.exe /d /s /c npm run installer:signed:pipeline -- --sign
```

## 署名に必要な環境変数

- `WINDOWS_SIGNING_CERT_THUMBPRINT`: Windows certificate store 上の署名証明書 thumbprint。
- `WINDOWS_SIGNING_PFX_PATH`: PFX を使う場合の local path。`D:\AI\secure` など repo 外に置く。
- `WINDOWS_SIGNING_PFX_PASSWORD`: PFX password。履歴や docs へ残さない。
- `WINDOWS_SIGNING_ENABLE`: `1` の場合だけ署名を実行する。
- `WINDOWS_SIGNING_TIMESTAMP_URL`: timestamp service。未指定時は pipeline の既定値を使う。
- `WINDOWS_MSIX_PUBLISHER`: MSIX manifest の Publisher。証明書 subject と一致させる。

PFX password を `signtool.exe /p` へ渡す経路は process list に残る可能性があるため、既定では pipeline が停止する。正式 release では PFX を certificate store へ import し、`WINDOWS_SIGNING_CERT_THUMBPRINT` を使う。

## 2026-05-11 現在の evidence

`npm run installer:signed:pipeline` は実行済みです。現在の環境では `wix.exe`、`makeappx.exe`、`signtool.exe` が PATH にないため、MSI は `dist/signed-installer-work/msi/Product.generated.wxs` まで、MSIX は `dist/signed-installer-work/msix/payload` まで生成しました。実署名と `signtool verify` は Windows SDK / WiX / 署名証明書を入れた release 環境で再実行します。

## 残タスク

- WiX Toolset を `E:\DevEnv` 以下へ導入し、pipeline から MSI を生成する。
- Windows SDK の `makeappx.exe` / `makepri.exe` を release 環境へ用意し、pipeline から MSIX package を生成する。
- `signtool.exe sign /fd SHA256 /tr <timestamp-url> /td SHA256 ...` を pipeline 経由で実行し、MSI / MSIX を署名する。
- 署名後に `Get-AuthenticodeSignature`、MSIX install、shortcut 起動、Dashboard 起動を確認し、release evidence に署名検証結果だけを記録する。
