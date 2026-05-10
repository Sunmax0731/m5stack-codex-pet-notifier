# Evaluation Criteria

QCDS は Quality、Cost、Delivery、Satisfaction で評価します。grade は `S+ / S- / A+ / A- / B+ / B- / C+ / C- / D+ / D-` のみ使います。

| Area | A- 以上の条件 | S+ 条件 |
| --- | --- | --- |
| Quality | schema、代表シナリオ、runtime gate、security/privacy が pass | Core2 実機、長時間 soak、回帰 baseline、manual evidence、adapter review、署名 readiness が再現可能 |
| Cost | 外部依存が少なく導入手順が短い | firmware / host / docs の運用が CI と手順で安定 |
| Delivery | prerelease、docs ZIP、release evidence が揃う | stable release へ昇格できる証跡が揃う |
| Satisfaction | ユーザーが導入、操作、未実施範囲を理解できる | 実機 UX の写真または動画と改善済み feedback がある |

beta では未完了の手動実機テストが残るため `S+` は付けません。
