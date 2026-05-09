# 要件定義

## 背景

Codex の回答完了、確認待ち、エラー、長文回答は PC 上の表示に寄りがちです。別作業中やフルスクリーン作業中でも状態変化に気づけるよう、机上の M5Stack へ Codex ペットと通知を表示します。

## ユーザー価値

- PC 画面を切り替えずに Codex の状態を把握できる。
- Yes / No / Other や 3 択の返事を M5Stack のボタンで即時送信できる。
- Codex App の pet 変更が机上端末にも反映され、作業環境の一貫性が出る。
- 長文回答を小型画面で確認し、必要な時だけ PC へ戻れる。

## MVP要件

- Host Bridge が pairing token を発行し、token なし device event を拒否できる。
- LAN Host Bridge を PC 上で起動し、同一 LAN の M5Stack が HTTP polling で Host -> Device event を受け取れる。
- `pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested`、`device.reply_selected`、`device.pet_interacted`、`device.heartbeat` の event contract を持つ。
- Core2 と GRAY の device profile を分け、touch / button / IMU fallback の差分を吸収する。
- simulator で pet 更新、通知、長文回答、選択肢返信、pet interaction、heartbeat を再現できる。
- sample telemetry と代表シナリオを `npm test` で検証できる。
- firmware は Core2 / GRAY の build target を分け、Core2 は upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、sample event poll を確認できる。

## 対象外

- インターネット越しの遠隔利用。
- 複数ユーザーの組織管理。
- M5Stack 上での Codex 推論実行。
- Codex App 内部 API へ固定依存する実装。
- 個人 pet sprite、token、host IP、会話本文の release asset 同梱。

## 成功条件

- `cmd.exe /d /s /c npm test` が通る。
- `cmd.exe /d /s /c npm run bridge:smoke` が通る。
- `dist/validation-result.json` に代表シナリオ結果が残る。
- `docs/platform-runtime-gate.json` で simulator、mock device、sample telemetry、device / host adapter、security/privacy 境界が pass する。
- Core2 実機で upload、Wi-Fi、pairing、sample event poll の証跡を残す。
- GRAY 実機、物理入力、実 Codex adapter の未確認項目が `docs/manual-test.md` と release notes に明記されている。
