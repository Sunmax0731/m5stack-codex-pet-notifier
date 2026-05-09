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

- 320x240 を基準に、上部に pet、下部に通知本文または選択肢を置く。
- pet は固定ヘッダー文言を伴わない pet surface として表示する。`Codex Pet`、`state`、`LAN`、`U:0` などの常時テキストは小型画面の情報密度を下げるため描画しない。
- hatch-pet asset がある場合は素材 frame と bounce を使う。Core2 では scale `1..8` ごとの高解像度 frame を生成しておき、現在の pet display area に対応する frame を描く。未生成時は fallback avatar で色、blink、bounce、tail の animation を変える。
- pet 表示倍率と UI / body text size は Host Bridge Dashboard の Display tab から `1..8` の8段階で実機へ送信し、現場で可読性を調整できるようにする。`petScale=8` は pet surface を画面全体に近い最大面積にする。
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
- Answer / Choice / Pet / Notification は tab で切り替え、同じ deviceId を使って送信する。
- Dashboard は side menu と event tabs で状態確認、送信、プレビュー、ABC 返信、Codex 回答、ログ、デバッグを分ける。
- Display tab は pet display area、UI text size、body text size を `1..8` slider で調整する。
- M5Stack 表示プレビューは 320x240 の simulated display として、pet surface、Answer / Choice / Notification の本文、footer button label の表示密度を送信前に確認できるようにする。
- ABC 返信ワークフローは Choice 送信、M5Stack A/B/C 押下、inbound reply 確認の順で見えるようにする。
- 最近の Codex 回答は Dashboard 上で読めるようにし、表示確認後に同じ panel から M5Stack へ送れるようにする。
- コマンド panel には bridge start、Core2 upload、Codex relay、clipboard、file watch、Codex session auto relay を表示する。

## Codex Session Strategy

- Codex App の非公開内部 API には接続しない。
- `%USERPROFILE%\.codex\sessions` の JSONL を opt-in で監視し、最新 user / assistant の組を `answer.completed` として送る。
- Codex Hooks が使える場合は、hook command から `codex:hook` を起動して one-shot 送信する。
- `--phase any` は進行中の commentary も送り、`--phase final` は完了応答だけに絞る。
- release evidence と hook state file には session 本文を保存しない。

## Pet Asset Strategy

- `%USERPROFILE%\.codex\pets` の hatch-pet package は local input とし、firmware には generated header として取り込む。
- `firmware/include/pet_asset.local.h` は個人素材を含む可能性があるため commit しない。
- scale-specific frame は local header 内に生成する。release asset には含めず、Core2 build 時にのみ使用し、GRAY は flash 制約のため base frame 拡大へ fallback する。
- header がない環境でも build が通るように firmware は vector fallback を持つ。
