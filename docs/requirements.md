# 要件定義

## 背景

Codexの回答完了、確認待ち、エラー、長文回答はPC上の表示に寄りがちです。別作業中やフルスクリーン作業中でもCodexの状態に気づけるよう、机上のM5StackへCodexペットと通知を表示します。

## ユーザー価値

- PC画面を切り替えずにCodexの状態を把握できる。
- Yes/No/Otherや3択の返事をM5Stackのボタンで即時送信できる。
- Codex Appのペット変更が机上端末にも反映され、作業環境の一貫性が出る。
- 長文回答を小型画面で読み、必要な時だけPCへ戻れる。

## 対象デバイス

| Device | 必須対応 | 入力方針 |
| --- | --- | --- |
| M5Stack Core2 | 対応必須 | タッチ、スワイプ、画面下部タッチボタン、必要に応じて物理操作 |
| M5Stack GRAY | 対応必須 | A/B/Cボタン、長押し、IMU tap代替 |

Core2はタッチ入力を前提にした操作を用意します。GRAYはタッチ非搭載profileとして扱い、画面タップ要求はボタン長押しまたはIMUの軽いタップ検知で代替します。

## MVP要件

- 同一Wi-Fi上のHost Bridgeを探索または手動設定できる。
- pairing codeまたはtokenで端末を登録できる。
- Codex通知を受信し、画面へ表示できる。
- Codex回答本文を受信し、長文をスクロールできる。
- 返信候補を最大3件まで表示し、A/B/Cで選択できる。
- Yes/No/Otherを3ボタンに割り当てられる。
- Codex Appでペットが変わった場合、`pet.updated`でM5Stack表示も更新される。
- ペット領域へのタップまたは代替操作で反応アニメーションを出す。

## 対象外

- インターネット越しの遠隔利用。
- 複数ユーザーの組織管理。
- M5Stack上でのCodex推論実行。
- Codex App内部APIへ固定依存する実装。
- 個人ペット素材や会話本文のrelease asset同梱。

## リリース前の必須成果物

- Host Bridge仕様。
- M5Stack firmware仕様。
- Simulator仕様。
- sample payload。
- security/privacy checklist。
- manual test結果。
- release checklist。
