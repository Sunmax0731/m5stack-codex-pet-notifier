# Traceability Matrix

| Requirement | Source | Spec | Test | Release Gate |
| --- | --- | --- | --- | --- |
| Core2 / GRAY対応 | User request 1 | device profile | Core2 / GRAY manual tests | 両方の結果をrelease本文に記載 |
| ボタン返信 | User request 2 | `device.reply_selected` | choice-request replay | host logで返信確認 |
| pet tap reaction | User request 3 | `device.pet_interacted` | Core2 tap / GRAY fallback | 操作差分を明記 |
| pet変更同期 | User request 4 | `pet.updated` | pet-update sample | sprite fallback確認 |
| Codex回答表示 | User request 5 | `answer.completed` | long text scroll test | 長文スクロール確認 |
| LAN内利用 | Domain policy | pairing / token | auth tests | 外部公開なし |
