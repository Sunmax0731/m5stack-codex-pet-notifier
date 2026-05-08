# テスト計画

## 自動検証

| Test | 内容 |
| --- | --- |
| schema validation | sample payloadがevent schemaに合格する |
| host bridge auth | tokenなし、token誤り、正しいtokenを検証する |
| event routing | pet、notification、answer、choiceがdevice sessionへ届く |
| reply routing | A/B/C返信がrequestEventId付きでhostへ戻る |
| scroll model | 長文回答の分割、位置、末尾判定を検証する |
| device profile | Core2 / GRAYの入力割り当て差分を検証する |

## Simulator検証

- `pet.updated`で表示petが変わる。
- `notification.created`で通知画面が出る。
- `answer.completed`で長文回答がスクロールできる。
- `prompt.choice_requested`でA/B/Cが表示される。
- `device.reply_selected`がhost logへ出る。
- 通信断でErrorまたはReconnecting表示へ移る。

## 実機検証

| Device | 必須確認 |
| --- | --- |
| Core2 | touch、swipe、Wi-Fi再接続、pet表示、choice返信、長文表示 |
| GRAY | A/B/C、IMU tap代替、ボタン式スクロール、Wi-Fi再接続、pet表示 |

## 受け入れ基準

- simulatorで主要5フローが通る。
- Core2 / GRAYの手動テスト表に結果がある。
- security/privacy checklistのblockerが0件。
- release checklistで未完了項目がprerelease本文に明記されている。
