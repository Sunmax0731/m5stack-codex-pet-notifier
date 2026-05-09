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
- Codex relay が clipboard / stdin / file から返答本文を取り込み、`answer.completed` として M5Stack に表示できる。
- Codex session adapter が `%USERPROFILE%\.codex\sessions` の最新 session JSONL を opt-in 監視し、最近の user / assistant のやり取りを自動で M5Stack に表示できる。
- Codex Hooks が使える環境では hook command から最新 session relay を one-shot 実行でき、重複送信を本文なしの state で抑止できる。
- Host Bridge 同梱 Dashboard から、sidebar 内の状態確認、event log、Answer / Decision / Notification 送信、M5Stack 表示プレビュー上の Pet / Display 設定、ABC 返信確認、最近の Codex session 回答表示と M5Stack 送信、環境構築コマンド modal を GUI 操作できる。
- 日本語の Codex 返答本文を Core2 画面で文字化けさせずに表示できる。
- Windows PowerShell の clipboard 経由でも日本語本文を UTF-8 のまま送信できる。
- `pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested`、`device.reply_selected`、`device.pet_interacted`、`device.heartbeat` の event contract を持つ。
- Core2 と GRAY の device profile を分け、touch / swipe / button / IMU fallback の差分を吸収する。
- simulator で pet 更新、通知、長文回答、選択肢返信、pet interaction、heartbeat を再現できる。
- sample telemetry と代表シナリオを `npm test` で検証できる。
- firmware は Core2 / GRAY の build target を分け、Core2 は upload、2.4GHz Wi-Fi 接続、Host Bridge pairing、sample event poll を確認できる。
- Host Bridge 再起動などで pairing token が失効した場合、firmware は再pairingに戻れる。再起動直後に実機が旧 `paired-*` token で poll した場合、Host Bridge はその token を再取り込みし、queued display / pet events を実機へ届けられる。
- M5Stack 上で pet avatar を描画し、state に応じた色、blink、bounce、tail animation を表示できる。
- pet avatar は off-screen Sprite へ描画してから画面へ転送し、animation tick で画面全体を塗り直さずちらつきを抑えられる。
- M5Stack 上の固定ヘッダー文言（`Codex Pet`、`state`、`LAN`、`U:0` など）は表示せず、pet surface と実イベント本文を優先する。
- Host Bridge Dashboard から pet 表示倍率と UI / body text size を `1..8` の8段階で動的に変更できる。`petScale=8` は pet を画面全体に近い最大面積で表示する設定とする。
- Host Bridge Dashboard から pet render FPS を `4..20fps` の範囲で動的に変更でき、既定は `12fps` とする。
- Host Bridge Dashboard から pet motion step を `120..800ms` の範囲で動的に変更でき、render FPS を上げてもキャラの pose / frame 切替が小刻みに震えないようにする。
- `%USERPROFILE%\.codex\pets` の hatch-pet package を local asset として firmware に反映できる。
- Host Bridge Dashboard から `%USERPROFILE%\.codex\pets` 配下の local hatch-pet package を選択し、必要に応じて path override で任意の local package を preview できる。
- Host Bridge Dashboard と `codex:display` から画面全体の背景、pet 背景、文字色、文字背景、文字枠を RGBA で送信し、M5Stack 表示へ反映できる。
- Host Bridge Dashboard と `codex:display` から pet の X/Y offset を送信し、pet を上下左右へ移動できる。offset は画面外にはみ出す値も許容し、頭だけ見せるような構図調整を可能にする。
- Host Bridge Dashboard では Answer / Decision / Notification の送信フォームを環境構築コマンド modal に統合し、独立した送信 section と Debug section は持たない。
- Windows では `start-dashboard.bat` をダブルクリックして background Bridge 起動と Dashboard 表示を実行できる。
- Codex answer 到着時に M5Stack の speaker / buzzer で短い beep 通知を鳴らす設定を送信できる。
- Dashboard の `M5Stack 表示プレビュー` は Core2 / GRAY を切り替え、320x240 display、入力差分、text overlay、現在の hatch-pet キャラを送信前に確認できる。
- hatch-pet 由来の個人 pet sprite は release asset、docs ZIP、Git commit に含めない。
- Codex の確認依頼を `prompt.choice_requested` として送り、M5Stack の A/B/C から `device.reply_selected` を返せる。
- `codex:decision` と `/codex/decision` により、正式リリースに向けた「Codex が M5Stack に三択判断を求める」workflow を CLI / Dashboard の両方から実行できる。

## 対象外

- インターネット越しの遠隔利用。
- 複数ユーザーの組織管理。
- M5Stack 上での Codex 推論実行。
- Codex App 内部 API へ固定依存する実装。
- Codex App の非公開内部データを scraping する実装。
- ユーザーの明示操作なしに Codex session log を外部送信する実装。
- 個人 pet sprite、token、host IP、会話本文の release asset 同梱。

## 成功条件

- `cmd.exe /d /s /c npm test` が通る。
- `cmd.exe /d /s /c npm run bridge:smoke` が通る。
- `cmd.exe /d /s /c npm run dashboard:smoke` が通る。
- `cmd.exe /d /s /c npm run codex:answer -- --text "..."` で Core2 に Answer が表示される。
- Dashboard から Choice を送り、Core2 の A/B/C 返信が inbound log に `device.reply_selected` として表示される。
- `cmd.exe /d /s /c npm run codex:sessions -- --once --phase any` で最新 Codex session のやり取りが `answer.completed` として queue される。
- Dashboard の `最近の Codex 回答` panel で最新 assistant 回答が表示され、`M5Stackへ送信` で `answer.completed` として queue される。
- Dashboard の `M5Stack 表示プレビュー` から `petScale`、`uiTextScale`、`bodyTextScale` を `1..8`、`animationFps` を `4..20`、`motionStepMs` を `120..800`、screen / pet / text / border RGBA、pet X/Y offset、beep を送ると、M5Stack の pet 表示面積、pet 位置、テキストサイズ、描画更新上限、pose 切替頻度、色、枠線、通知音が次回描画または次回 answer から変わる。
- Dashboard の `M5Stack 表示プレビュー` は Host Bridge が配信する現在の local hatch-pet spritesheet を使い、実機と同じキャラを表示する。Core2 / GRAY の preview 切替も表示できる。
- `cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001` で hook 経由相当の one-shot relay が実行できる。
- `cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\.codex\pets\Mira --output firmware\include\pet_asset.local.h` 後に Core2 firmware を upload し、pet avatar が hatch-pet asset として表示される。
- `pet:asset` は Core2 向けに `1..8` の scale-specific frame set を生成し、M5Stack の pet 表示倍率が変わったときに低解像度 base frame の単純拡大ではなく対応する解像度の frame を表示できる。
- `pet:asset` は hatch-pet の idle row から非空 frame 数を自動検出し、Mira のような6フレーム pet を固定4フレームに切り詰めずに firmware へ反映できる。
- pet animation tick では `M5Canvas` Sprite の pet surface を off-screen 合成し、画面全体の黒塗りや Answer / Choice / footer text の明滅が発生しない。
- Answer / Decision / Notification の本文は pet surface に重ねて表示し、Dashboard preview と実機 layout が一致する。
- `cmd.exe /d /s /c npm run codex:answer -- --summary "日本語表示" --text "これは日本語の表示確認です。"` で Core2 に日本語本文が表示される。
- `dist/validation-result.json` に代表シナリオ結果が残る。
- `docs/platform-runtime-gate.json` で simulator、mock device、sample telemetry、device / host adapter、security/privacy 境界が pass する。
- Core2 実機で upload、Wi-Fi、pairing、Codex relay answer、A button reply の証跡を残す。
- GRAY 実機、長時間運用、実 Codex App 内部 API 連携の対象外範囲が `docs/manual-test.md` と release notes に明記されている。
