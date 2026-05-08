# Security / Privacy Checklist

## 認証

- [ ] pairing codeは短時間で失効する。
- [ ] device eventはtokenなしで受け付けない。
- [ ] tokenはrelease assetやsampleへ含めない。
- [ ] Host Bridgeの外部公開設定は初期値で無効。

## データ保護

- [ ] 通知本文をdevice flashへ永続保存しない。
- [ ] 回答本文をdevice flashへ永続保存しない。
- [ ] pet spriteや個人素材を公開assetへ含めない。
- [ ] host logに会話本文を保存する場合は明示設定にする。

## 操作安全

- [ ] M5Stackから送れる返信は、hostが提示したchoice IDに限定する。
- [ ] Otherは自由入力ではなく、Codex側に「Otherを選択」した事実だけ返す。
- [ ] 古いrequestEventIdへの返信はhost側で拒否する。

## LAN安全

- [ ] mDNS発見後もtoken検証する。
- [ ] CORSまたはlocal web UIの公開範囲を明記する。
- [ ] firewall例外を作る場合は手動手順にする。
