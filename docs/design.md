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

MVP は Host Bridge 方式です。M5Stack firmware は Codex App の詳細を知らず、`pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested` などの正規イベントだけを処理します。closed alpha では Codex relay を使い、clipboard / stdin / file から実際の返答本文を送れるようにします。

## 画面デザイン

- 320x240 を基準に、上部に pet、下部に通知本文または選択肢を置く。
- pet は header 内の小型 avatar として常時表示し、hatch-pet asset がある場合は素材 frame と bounce を使う。未生成時は fallback avatar で色、blink、bounce、tail の animation を変える。
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
- ABC 返信ワークフローは Choice 送信、M5Stack A/B/C 押下、inbound reply 確認の順で見えるようにする。
- コマンド panel には bridge start、Core2 upload、Codex relay、clipboard、file watch を表示する。

## Pet Asset Strategy

- `%USERPROFILE%\.codex\pets` の hatch-pet package は local input とし、firmware には generated header として取り込む。
- `firmware/include/pet_asset.local.h` は個人素材を含む可能性があるため commit しない。
- header がない環境でも build が通るように firmware は vector fallback を持つ。
