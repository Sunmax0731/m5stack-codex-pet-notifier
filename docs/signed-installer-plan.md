# 署名付き MSI / MSIX 準備

## 方針

現在の配布物は user-local shortcut installer ZIP です。正式配布へ進めるため、署名付き MSI / MSIX の前提確認とテンプレートを追加します。証明書、PFX、password、timestamp service の秘密情報は repo に保存しません。

## 追加成果物

- `installer/wix/Product.wxs`: per-user MSI の WiX v4 テンプレート。
- `installer/msix/Package.appxmanifest`: MSIX manifest テンプレート。
- `tools/windows-signing-check.mjs`: `signtool.exe`、`wix.exe`、`makeappx.exe`、`makepri.exe` と signing env を確認する readiness checker。
- `dist/windows-signing-readiness.json`: readiness checker の出力。

## コマンド

```powershell
cd D:\AI\IoT\m5stack-codex-pet-notifier
cmd.exe /d /s /c npm run installer:signing:check
```

## 署名に必要な環境変数

- `WINDOWS_SIGNING_CERT_THUMBPRINT`: Windows certificate store 上の署名証明書 thumbprint。
- `WINDOWS_SIGNING_PFX_PATH`: PFX を使う場合の local path。`D:\AI\secure` など repo 外に置く。
- `WINDOWS_SIGNING_PFX_PASSWORD`: PFX password。履歴や docs へ残さない。

## 残タスク

- WiX Toolset を `E:\DevEnv` 以下へ導入し、`installer/wix/Product.wxs` から MSI を生成する。
- Windows SDK の `makeappx.exe` / `makepri.exe` で MSIX package を生成する。
- `signtool.exe sign /fd SHA256 /tr <timestamp-url> /td SHA256 ...` で MSI / MSIX を署名する。
- 署名後に `Get-AuthenticodeSignature`、MSIX install、shortcut 起動、Dashboard 起動を確認し、release evidence に署名検証結果だけを記録する。
