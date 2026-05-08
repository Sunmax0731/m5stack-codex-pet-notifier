# リリースチェックリスト

## Required Before Prerelease

- [ ] READMEが導入手順と制約を説明している。
- [ ] requirements、specification、design、architectureが一致している。
- [ ] sample payloadがschemaに合格する。
- [ ] Host Bridge mockが通知、回答、選択肢、pet更新を配信できる。
- [ ] Simulatorで代表フローが通る。
- [ ] Core2実機確認を実施または未実施として明記する。
- [ ] GRAY実機確認を実施または未実施として明記する。
- [ ] security/privacy checklistのblockerが0件。
- [ ] 個人token、host IP、会話本文、pet素材がrelease assetへ含まれていない。

## Release Assets

- `dist/m5stack-codex-pet-notifier-docs.zip`
- Host Bridge archive
- Firmware binary for Core2
- Firmware binary for GRAY
- Sample payload archive

## Release Notes Must Include

- prereleaseであること。
- 実機確認済み範囲。
- 手動テスト未実施範囲。
- Codex App adapterがmockまたは実連携のどちらか。
- security/privacy上の既知制約。
