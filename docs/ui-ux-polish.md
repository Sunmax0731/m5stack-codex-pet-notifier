# UI / UX Polish

## Closed Alphaで整えた点

- Choice 画面の A/B/C 対応を固定し、Core2 / GRAY で意味が変わらないようにした。
- Answer 画面は長文を固定領域に詰め込まず page と scroll model で扱う。
- pet interaction は返信とは別 event にし、誤送信を避ける。
- Error / Pairing / Idle / Notification / Answer / Choice の状態を明示した。

## 次の磨き込み

- Core2 実機で touch 領域と swipe 量を調整する。
- GRAY 実機で IMU tap の閾値と B 長押しの誤検知を比較する。
- 小型画面で日本語本文が読みやすい文字数、行数、ページ表示を調整する。
- pet sprite の fallback 表示を権利確認済み asset で作る。
