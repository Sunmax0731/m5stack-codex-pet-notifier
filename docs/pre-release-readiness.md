# Pre-release Readiness

## Current State

| Area | Status | Note |
| --- | --- | --- |
| Idea intake | Ready | IoT No.18として登録済み |
| Requirements | Ready | MVPと対象外を定義済み |
| Specification | Ready | event契約と画面状態を定義済み |
| Design | Ready | Host Bridge方式を採用 |
| Architecture | Ready | bridge / firmware / simulator境界を定義 |
| Test plan | Ready | simulatorと実機手動テストを分離 |
| Implementation | Not started | docs-only |
| Manual test | Not run | Core2 / GRAY実機確認待ち |
| Release | Partially ready | docs ZIPは作成済み。firmwareとhost bridge artifactは未生成 |

## Blockers

- Host Bridge未実装。
- Firmware未実装。
- Simulator未実装。
- Core2 / GRAY実機テスト未実施。
- Codex Appのpet設定変更検出方法がadapter調査待ち。

## Next Action

1. JSON Schemaとsample replayを実装する。
2. Host Bridge mockを作る。
3. Simulatorで表示状態を確認する。
4. M5Unified firmware scaffoldを作る。
