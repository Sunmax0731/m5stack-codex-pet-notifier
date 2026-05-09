# 設計

## 3つの候補

| Option | 構成 | 採用判断 |
| --- | --- | --- |
| A. Direct Codex App access | M5Stack が Codex App のローカル状態を直接読む | 不採用。Codex App の内部変更に弱く firmware が壊れやすい |
| B. Host Bridge over LAN | PC 上の bridge が Codex 状態を正規イベント化し M5Stack へ配信する | 採用。Codex 側差分を bridge へ閉じ込められ simulator も作りやすい |
| C. MQTT Broker | MQTT topic で Codex、M5Stack、Home Assistant を接続する | 後続候補。複数端末には強いが MVP には重い |

## 評価基準

- Codex App 側の変更に追従しやすいこと。
- Core2 / GRAY の両方に同じ event contract を使えること。
- 実機なしで runtime gate を通せること。
- LAN 内でも pairing token による安全境界を置けること。
- 将来 MQTT や Home Assistant へ拡張できること。

## 採用設計

MVP は Host Bridge 方式です。M5Stack firmware は Codex App の詳細を知らず、`pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested` などの正規イベントだけを処理します。closed alpha では Codex relay を使い、clipboard / stdin / file / local session JSONL から実際の返答本文を送れるようにします。

## 画面デザイン

- 320x240 を基準に、pet を画面背景として大きく見せ、通知本文、回答、選択肢は pet surface に重ねる。
- pet は固定ヘッダー文言を伴わない pet surface として表示する。`Codex Pet`、`state`、`LAN`、`U:0` などの常時テキストは小型画面の情報密度を下げるため描画しない。
- hatch-pet asset がある場合は素材 frame と bounce を使う。Core2 では scale `1..8` ごとの高解像度 frame を生成しておき、現在の pet display area に対応する frame を描く。未生成時は fallback avatar で色、blink、bounce、tail の animation を変える。
- pet surface は off-screen Sprite で合成してから画面へ転送する。本文は preview と同じく pet に重ねて再描画し、画面全体の黒塗りを避ける。
- pet 表示倍率と UI / body text size は Host Bridge Dashboard の `M5Stack 表示プレビュー` から `1..8` の8段階で実機へ送信し、現場で可読性を調整できるようにする。`petScale=8` は pet surface を画面全体に近い最大面積にする。
- pet render FPS は preview から `4..20fps` で実機へ送信し、pose / frame 切替は `motionStepMs` で分離する。既定 `12fps / 280ms` とし、小刻みな震えを避ける。
- 画面背景、pet 背景、本文文字色、本文背景、文字枠は `display.settings_updated.display.*Rgba` で送信する。Dashboard は各項目を1つの RGBA picker として表示し、section 上で現在色の swatch と `#hex / alpha` を同時に見せる。M5Stack firmware は object / hex string / channel array のRGBAを受け取り、LCD 上では最終RGB565色へ合成して描画する。local hatch-pet asset の透明ピクセルは固定アクセント色ではなく pet background を見せ、Dashboard preview は CSS rgba で送信前の見え方を近似する。
- `answer.completed` 到着時は `beepOnAnswer=true` の場合だけ短い beep を鳴らし、通知音を表示設定と同じ経路で制御する。
- Choice 画面では A/B/C の位置を固定し、誤選択を避ける。
- Answer 画面では本文領域を固定し、ページ位置を表示する。
- Error 画面は再接続中、token 失効、host 未検出、payload 不正を区別する。

## Interaction

- pet tap は反応イベントであり返信送信とは分ける。
- GRAY では IMU 閾値とボタン長押しの両方を設定候補にし、誤検知を避ける。
- 通知と選択肢が同時に来た場合、Choice を優先表示し通知は未読として残す。

## Dashboard GUI

- Host Bridge の操作画面は実運用向けの密度にし、marketing hero や説明だけの画面にしない。
- 第一画面で paired device、outbound、inbound、security rejection を確認できる。
- Answer / Decision / Notification は環境構築コマンド modal のデバッグ送信領域で扱い、同じ deviceId を使って送信する。Pet と Display は preview の操作領域へ統合する。
- Dashboard は side menu で状態確認、プレビュー、Codex 回答、ログへ移動できる。状態確認 section は sidebar 内に表示し、paired / outbound / inbound / security を常時確認できる。独立したデバッグ section は持たない。各 section は View / Hide で折りたためる。
- M5Stack 表示プレビューは 320x240 の simulated display として、Host Bridge が配信する現在の local hatch-pet spritesheet、Answer / Decision / Notification の本文、footer button label の表示密度、render FPS、motion step、RGBA、beep 設定を送信前に確認できるようにする。プレビュー section は1ペイン全幅とし、画面プレビュー、readout、asset、表示設定を同じ面で確認できるようにする。
- Preview は Core2 / GRAY を切り替えられる。どちらも 320x240 LCD として扱い、Core2 は touch 前提、GRAY は button 前提のreadoutを出す。
- M5Stack 表示プレビューは1ペイン全幅、Recent Codex Answer と Event Log は左右2カラムで並べる。
- 主要 field は `?` help icon のクリックで hint を表示し、設定項目の意味を画面内で確認できるようにする。
- Decision 返信ワークフローは環境構築コマンド modal に統合し、Decision 送信、M5Stack A/B/C 押下、inbound reply 確認の順で見えるようにする。
- 最近の Codex 回答は Dashboard 上で読めるようにし、表示確認後に同じ panel から M5Stack へ送れるようにする。
- bridge start、Core2 upload、Codex relay、clipboard、file watch、Codex session auto relay、sample replay などのコマンドは sidebar button から開く modal に表示し、環境構築 / デバッグ送信のtabからパラメータ付きで実行できる。実行はlocalhost限定のallowlist commandにする。

## Codex Session Strategy

- Codex App の非公開内部 API には接続しない。
- `%USERPROFILE%\.codex\sessions` の JSONL を opt-in で監視し、最新 user / assistant の組を `answer.completed` として送る。
- Codex Hooks が使える場合は、hook command から `codex:hook` を起動して one-shot 送信する。
- `--phase any` は進行中の commentary も送り、`--phase final` は完了応答だけに絞る。
- release evidence と hook state file には session 本文を保存しない。

## Pet Asset Strategy

- `%USERPROFILE%\.codex\pets` の hatch-pet package は local input とし、firmware には generated header として取り込む。Dashboard は `/pet/packages` で同配下の package を列挙し、`petDir` override で任意の local package を preview する。
- `firmware/include/pet_asset.local.h` は個人素材を含む可能性があるため commit しない。
- scale-specific frame は local header 内に生成する。idle row の非空セルから frame 数を自動検出し、release asset には含めず、Core2 build 時にのみ使用する。GRAY は flash 制約のため local header を取り込まず vector fallback と `huge_app.csv` partition で build gate を通す。
- header がない環境でも build が通るように firmware は vector fallback を持つ。
