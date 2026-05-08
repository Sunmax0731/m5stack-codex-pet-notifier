# 設計

## 3つの候補

| Option | 構成 | 採用判断 |
| --- | --- | --- |
| A. Direct Codex App access | M5StackがCodex Appのローカル状態を直接読む | 不採用。Codex Appの内部変更に弱く、M5Stack firmwareが壊れやすい |
| B. Host Bridge over LAN | PC上のbridgeがCodex状態を正規イベント化し、M5Stackへ配信する | 採用。Codex側差分をbridgeへ閉じ込められ、simulatorも作りやすい |
| C. MQTT Broker | MQTT topicでCodex、M5Stack、Home Assistantを接続する | 後続候補。複数端末には強いがMVPには重い |

## 評価基準

- Codex App側の変更に追従しやすいこと。
- Core2 / GRAYの両方に同じイベント契約を使えること。
- 実機なしで検証できること。
- LAN内でも認証境界を置けること。
- 将来MQTTやHome Assistantへ拡張できること。

## 採用設計

MVPはHost Bridge方式を採用します。M5Stack firmwareはCodex Appの詳細を知らず、`pet.updated`、`notification.created`、`answer.completed`、`prompt.choice_requested`などの正規イベントだけを処理します。

## 画面デザイン

- 320x240を基準に、上部にpet、下部に通知本文または選択肢を置く。
- Choice画面ではA/B/Cの位置を固定し、誤選択を避ける。
- Answer画面では本文領域を固定し、スクロールバーまたはページ位置を表示する。
- Error画面は短く、再接続中、token失効、host未検出を区別する。

## Interaction

- pet tapは状態を変えるだけで、返信送信とは分ける。
- GRAYではtap代替を誤検知しないよう、IMU閾値とボタン長押しの両方を設定で選べるようにする。
- 通知と選択肢が同時に来た場合、Choiceを優先表示し、通知は未読として残す。
