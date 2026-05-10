# UI / UX Polish

## Closed Alphaで整えた点

- Choice 画面の A/B/C 対応を固定し、Core2 と button reference preview で意味が変わらないようにした。
- Answer 画面は長文を固定領域に詰め込まず page と scroll model で扱う。
- pet interaction は返信とは別 event にし、誤送信を避ける。
- Error / Pairing / Idle / Notification / Answer / Choice の状態を明示した。
- Host Bridge Dashboard を追加し、状態確認、event 送信、ABC 返信確認、debug command 参照を PC 側 GUI で行えるようにした。
- M5Stack header に pet avatar を追加し、state に応じた色、blink、bounce、tail animation を表示するようにした。

## 次の磨き込み

- Core2 実機で touch 領域と swipe 量を調整する。
- Button reference preview は IMU なしの互換確認に限定し、GRAY 実機 / GRAY IMU の磨き込みは対象外とする。
- 小型画面で日本語本文が読みやすい文字数、行数、ページ表示を調整する。
- pet sprite の fallback 表示を権利確認済み asset で作る。
- Dashboard と実機をつないだ長時間 UX を確認し、event log の密度と更新間隔を調整する。
